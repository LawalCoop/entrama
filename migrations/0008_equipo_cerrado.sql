-- Un equipo cerrado se puede volver a abrir.
--
-- Hasta acá "cerrado" no se guardaba: se deducía de tener `reflexion` y
-- `accionables` cargados. Eso alcanzaba para mostrar el ✓ LISTO, pero dejaba
-- sin salida al equipo que envía el cierre antes de tiempo o por error: para
-- volver a ponerlo en curso había que borrarle la reflexión y los accionables,
-- o sea tirar lo que el grupo venía escribiendo.
--
-- Con un flag aparte, reabrir es cambiar un booleano y el contenido queda donde
-- estaba: el equipo sigue editando desde donde dejó.
alter table public.facttic_equipos
  add column if not exists cerrado boolean not null default false;

-- Los que ya habían cerrado antes de esta migración quedan cerrados. Es la
-- misma condición que usaba la app para pintarlos: sin esto, el ✓ LISTO se
-- perdería en todos y un plenario en curso vería sus equipos volver a "En
-- progreso" de golpe.
update public.facttic_equipos
   set cerrado = true
 where reflexion is not null
   and reflexion <> ''
   and accionables is not null
   and array_length(accionables, 1) > 0;

update app_info set value = '8' where key = 'schema_version';
