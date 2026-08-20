-- Marcar el cierre desde la base y no desde el navegador.
--
-- `cerrado` lo seteaba el cliente, mandándolo junto con la reflexión y los
-- accionables. Eso falla con la app abierta: durante la actividad la gente tiene
-- la pantalla puesta desde el principio, y un deploy no les cambia el
-- JavaScript hasta que recarguen. Pasó en vivo: un equipo mandó su cierre desde
-- una pestaña vieja, se guardaron la reflexión y los accionables, `cerrado`
-- quedó en false, y el panel lo siguió mostrando "En progreso".
--
-- Pedirle a cien personas que recarguen no es un plan. Acá el cierre se deduce
-- de lo que se guardó, así que da igual qué versión tenga cada celular.

create or replace function public.marcar_equipo_cerrado()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Tres condiciones, y las tres importan:
  --
  -- 1. Que este update no hable de `cerrado`. Si lo trae, manda lo que pidieron:
  --    así "Reabrir" —que manda `cerrado = false` y nada más— no se deshace solo.
  -- 2. Que quede una reflexión con texto. Es lo que distingue un cierre de un
  --    guardado a medias.
  -- 3. Que la reflexión o los accionables hayan cambiado en este update. Sin
  --    esto, editarle el nombre o el color a un equipo reabierto lo volvería a
  --    cerrar, porque su reflexión sigue ahí.
  if new.cerrado is not distinct from old.cerrado
     and new.reflexion is not null
     and btrim(new.reflexion) <> ''
     and (new.reflexion   is distinct from old.reflexion
       or new.accionables is distinct from old.accionables)
  then
    new.cerrado := true;
  end if;

  return new;
end;
$$;

drop trigger if exists facttic_equipos_marcar_cerrado on public.facttic_equipos;

create trigger facttic_equipos_marcar_cerrado
  before update on public.facttic_equipos
  for each row
  execute function public.marcar_equipo_cerrado();

-- Queda un caso que esto no cubre: reabrir un equipo y volver a mandarle el
-- cierre **sin cambiarle una coma**. Ahí no cambia ni la reflexión ni los
-- accionables, así que el trigger no lo marca. Es raro —si lo reabrieron es
-- para tocar algo— y los clientes actualizados lo resuelven igual, porque
-- mandan `cerrado` ellos mismos.

update app_info set value = '9' where key = 'schema_version';
