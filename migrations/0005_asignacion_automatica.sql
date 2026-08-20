-- Asignación automática de equipo al anotarse.
--
-- Antes cada persona elegía su equipo de una lista y la app le sugería moverse
-- si el equipo estaba lleno o si ya había alguien de su cooperativa. Esa
-- sugerencia llegaba tarde —después de elegir— y era fácil de ignorar, así que
-- los equipos terminaban armados por quién madrugó, no por criterio.
--
-- Ahora al anotarse ya salís con equipo. Seguís pudiendo cambiarlo: la pantalla
-- de selección manual quedó igual, colgada del botón "Cambiar de equipo".

-- Lo que hace falta saber de cada quien para poder mezclarlos.
--
-- Va en el participante y no en `cooperativas` a propósito: el catálogo lo
-- comparten la dinámica y /recolectar, es público y editable, y ahí un dato
-- equivocado se propaga a todas las personas de esa organización. Acá cada
-- quien declara lo suyo. El formulario igual autocompleta desde alguien de la
-- misma cooperativa que ya se haya anotado, así que en la práctica se tipea una
-- sola vez por organización.
alter table public.facttic_participantes
  add column if not exists provincia         text,
  add column if not exists tipo_organizacion text,
  add column if not exists actividades       text[];

-- Los tres niveles del Estado son un solo tipo a la hora de mezclar: un equipo
-- con alguien de un municipio y alguien de una provincia no es diverso en
-- "tipo de organización", es dos veces Estado. Pero el dato fino sirve para
-- leer después quién vino, así que se guarda entero y la familia se deriva.
--
-- Generada por Postgres y no calculada por el cliente, mismo criterio que el
-- `slug` de cooperativas: si lo computara quien inserta, el día que cambie la
-- lista de tipos habría filas viejas agrupando distinto que las nuevas.
alter table public.facttic_participantes
  add column if not exists familia_organizacion text
  generated always as (
    case
      when tipo_organizacion like 'estado-%' then 'estado'
      else tipo_organizacion
    end
  ) stored;

-- Para que el scoring no tenga que recorrer la tabla entera por cada equipo.
create index if not exists facttic_participantes_equipo_idx
  on public.facttic_participantes (equipo_id);

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
  p_actividades       text[]
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
           equipo_id         = v_equipo_id,
           terminado         = false,
           updated_at        = now()
     where id = v_fila.id
    returning * into v_fila;
  else
    insert into public.facttic_participantes
      (device_id, nombre, cooperativa, provincia, tipo_organizacion, actividades, equipo_id, terminado)
    values
      (p_device_id, p_nombre, p_cooperativa, p_provincia, p_tipo_organizacion, p_actividades, v_equipo_id, false)
    returning * into v_fila;
  end if;

  return v_fila;
end;
$$;

grant execute on function public.asignar_equipo(text, text, text, text, text, text[]) to anon;

update app_info set value = '5' where key = 'schema_version';
