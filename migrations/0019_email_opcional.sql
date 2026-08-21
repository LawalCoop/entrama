-- Los dos formularios pasan a pedir un email, opcional en los dos.
--
-- `problemas` lo recibe de /recolectar y `facttic_participantes` de la dinámica.
-- Es el mismo dato y viaja por la misma clave de localStorage que el resto del
-- perfil (`facttic_email`), así que quien pasa por un formulario llega al otro
-- con el campo puesto.
--
-- Nullable en las dos, y por el mismo motivo que la 0013: es un formulario
-- voluntario, y cada campo obligatorio de más es gente que abandona antes de
-- contar su problema. Ojo con esto al leer después: va a estar vacío en todo lo
-- cargado antes de este deploy.
--
-- Sin RLS: las dos tablas ya la tienen activada, y es a nivel de tabla. Sin
-- índice: nadie consulta por email.
--
-- Esta migración nació como `0018_email_opcional.sql` y se renumeró: otra rama
-- creó su propio 0018 —las federaciones— mientras esta se escribía, y dos
-- archivos con el mismo número dejan ambigua la secuencia. Mismo criterio que
-- la 0007, y seguro por lo mismo: el cuerpo es idempotente y los únicos
-- entornos son la base local y Supabase. El registro viejo se borra al final
-- para que `_migrations` no quede con un fantasma sin archivo.
alter table public.problemas
  add column if not exists email text;

alter table public.facttic_participantes
  add column if not exists email text;

-- `asignar_equipo` vuelve a crearse entera para recibir el email.
--
-- Postgres no deja agregar un argumento en el lugar: `create or replace`
-- matchea por firma, así que crearía una segunda función de seis argumentos al
-- lado de la de siete y PostgREST podría resolver a la vieja, tirando el email
-- en silencio. Por eso el drop primero.
--
-- El cuerpo es el de la 0005, copiado sin tocar: cambian la firma, dos `update`
-- y el `insert`, y nada del reparto de equipos. Los pesos, el lock y el scoring
-- son los mismos.
--
-- `p_email` va último y con `default null` para que una pestaña ya abierta,
-- entre que corre esta migración y termina el deploy, siga resolviendo acá con
-- sus seis argumentos de siempre en vez de romperse.
drop function if exists public.asignar_equipo(text, text, text, text, text, text[]);

/*
 * Elige equipo para quien se anota y lo deja anotado, todo junto.
 *
 * Por qué acá adentro y no en el navegador: al arrancar la actividad se anotan
 * casi todos a la vez. Si cada navegador se trae la foto de la base, calcula y
 * después inserta, todos ven el mismo equipo como "el más vacío" y se amontonan
 * ahí. El lock de abajo serializa las llamadas, así que cada una decide viendo
 * ya sumada a la anterior.
 *
 * No es `security definer`: todo lo que hace —leer equipos y participantes,
 * insertar un participante— es lo que anon ya puede hacer por policy. Elevar
 * privilegios no compraría nada. Tampoco es una barrera: quien quiera puede
 * insertarse en el equipo que se le antoje con la anon key, igual que antes.
 * Esto ordena la asignación, no la custodia.
 */
create or replace function public.asignar_equipo(
  p_device_id         text,
  p_nombre            text,
  p_cooperativa       text,
  p_provincia         text,
  p_tipo_organizacion text,
  p_actividades       text[],
  p_email             text default null
)
returns public.facttic_participantes
language plpgsql
set search_path = public
as $$
declare
  -- Cuánto pesa cada criterio. El de tamaño es la unidad: los demás se leen
  -- como "cuántas personas de diferencia estoy dispuesto a tolerar con tal de
  -- no repetir esto".
  --
  -- Con estos números, a igualdad de tamaño manda la diversidad; con dos
  -- personas de diferencia manda el tamaño. Que es el orden que se buscaba:
  -- equipos parejos primero, variados después.
  PESO_TAMANIO    constant int := 10;  -- por cada persona ya en el equipo
  PESO_COOPERATIVA constant int := 25; -- por cada persona de la misma organización
  PESO_TIPO       constant int := 6;   -- por cada una de la misma familia de organización
  PESO_ACTIVIDAD  constant int := 4;   -- por cada una que comparta alguna actividad
  PESO_PROVINCIA  constant int := 2;   -- por cada una de la misma provincia

  v_familia   text;
  v_equipo_id uuid;
  v_fila      public.facttic_participantes;
  -- Guarda si ya estaba anotado. No sirve `found` para esto: lo pisa cada
  -- consulta, y entre el select de más abajo y el momento de usarlo hay otro.
  v_existe    boolean;
begin
  -- Serializa las asignaciones. Es un lock de transacción, así que se suelta
  -- solo al terminar; PostgREST envuelve cada llamada en una, de modo que dura
  -- lo que dura esta función. La clave es arbitraria: lo único que importa es
  -- que todas las llamadas usen la misma.
  perform pg_advisory_xact_lock(hashtext('asignar_equipo'));

  v_familia := case
                 when p_tipo_organizacion like 'estado-%' then 'estado'
                 else p_tipo_organizacion
               end;

  -- Quien ya está anotado no se reasigna: actualiza sus datos y se queda donde
  -- está. Si volviera a caer en otro equipo, refrescar la página te movería de
  -- grupo en medio de la charla.
  select * into v_fila
  from public.facttic_participantes
  where device_id = p_device_id;
  v_existe := found;

  if v_existe and v_fila.equipo_id is not null then
    update public.facttic_participantes
       set nombre            = p_nombre,
           cooperativa       = p_cooperativa,
           provincia         = p_provincia,
           tipo_organizacion = p_tipo_organizacion,
           actividades       = p_actividades,
           email             = p_email,
           updated_at        = now()
     where id = v_fila.id
    returning * into v_fila;

    return v_fila;
  end if;

  -- El equipo que menos penalización acumula.
  --
  -- `count(p.id) filter (...)` y no `count(*)`: con el left join, un equipo sin
  -- nadie trae igual una fila con todo en null, y `count(*)` la contaría como
  -- una persona.
  select e.id into v_equipo_id
  from public.facttic_equipos e
  left join public.facttic_participantes p on p.equipo_id = e.id
  where e.activo
  group by e.id
  order by
      count(p.id) * PESO_TAMANIO
    + count(p.id) filter (
        where lower(trim(p.cooperativa)) = lower(trim(p_cooperativa))
      ) * PESO_COOPERATIVA
    + count(p.id) filter (
        where p.familia_organizacion is not distinct from v_familia
      ) * PESO_TIPO
    + count(p.id) filter (
        where p.actividades && p_actividades
      ) * PESO_ACTIVIDAD
    + count(p.id) filter (
        where p.provincia is not distinct from p_provincia
      ) * PESO_PROVINCIA
    asc,
    -- Desempate al azar. Sin esto, con la base vacía las primeras seis personas
    -- empatan en cero y todas caen en el mismo equipo: el que gane el orden que
    -- devuelva Postgres, que es estable.
    random()
  limit 1;

  -- Sin equipos activos no hay a dónde mandar a nadie. Mejor un error que una
  -- fila sin equipo que la app no sabe mostrar.
  if v_equipo_id is null then
    raise exception 'No hay equipos activos para asignar';
  end if;

  if v_existe then
    -- Estaba anotado pero sin equipo: viene de "Cambiar de equipo".
    update public.facttic_participantes
       set nombre            = p_nombre,
           cooperativa       = p_cooperativa,
           provincia         = p_provincia,
           tipo_organizacion = p_tipo_organizacion,
           actividades       = p_actividades,
           email             = p_email,
           equipo_id         = v_equipo_id,
           terminado         = false,
           updated_at        = now()
     where id = v_fila.id
    returning * into v_fila;
  else
    insert into public.facttic_participantes
      (device_id, nombre, cooperativa, provincia, tipo_organizacion, actividades, email, equipo_id, terminado)
    values
      (p_device_id, p_nombre, p_cooperativa, p_provincia, p_tipo_organizacion, p_actividades, p_email, v_equipo_id, false)
    returning * into v_fila;
  end if;

  return v_fila;
end;
$$;

-- El grant no se hereda de la función vieja: la firma es otra.
grant execute on function public.asignar_equipo(text, text, text, text, text, text[], text) to anon;

delete from _migrations where name = '0018_email_opcional.sql';

update app_info set value = '19' where key = 'schema_version';
