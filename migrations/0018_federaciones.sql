-- Federación y Confederación, dos tipos que faltaban.
--
-- Entre lo que se anotó hay organizaciones que no son ninguna de las ocho de la
-- 0012: una federación de cooperativas no es una cooperativa —no la integran
-- personas sino organizaciones— ni cae bien en "Organización", que quedó como
-- el cajón de lo que no es ni mutual ni universidad ni Estado. Elegir "Otra"
-- funciona para anotarse, pero borra el dato justo donde sirve: al armar
-- equipos, dos "Otra" cuentan como la misma familia sin serlo.
--
-- No llevan nada especial: el prefijo `estado-` de la 0005 es lo único que hace
-- que dos tipos cuenten como uno solo, así que cada una de estas queda como su
-- propia familia, que es lo correcto. Federación y Confederación tampoco se
-- agrupan entre sí: una confederación federa federaciones, y un equipo con
-- alguien de cada una sí es diverso.
--
-- El slug lo genera la columna de la 0012: 'federacion' y 'confederacion', sin
-- acento, porque `translate` los saca antes del reemplazo de espacios.
insert into public.tipos_organizacion (nombre, orden) values
  ('Federación',    4),
  ('Confederación', 5)
on conflict (slug) do nothing;

-- Los `orden` de la 0012 estaban tomados de a uno, así que meter estas dos en
-- su lugar —al lado de Cooperativa y Mutual, que es a quienes federan— obliga a
-- correr las que venían después. `orden` no lo referencia nadie más que el
-- `order by` de `listarOpciones`: mover un número acá no toca ninguna fila
-- guardada, que apunta al slug.
--
-- "Otra" se va a 99 en vez de a 10: es la que siempre tiene que quedar última,
-- y dejarle aire evita repetir este mismo corrimiento la próxima vez.
update public.tipos_organizacion set orden = 6  where slug = 'universidad';
update public.tipos_organizacion set orden = 7  where slug = 'estado-municipal';
update public.tipos_organizacion set orden = 8  where slug = 'estado-provincial';
update public.tipos_organizacion set orden = 9  where slug = 'estado-nacional';
update public.tipos_organizacion set orden = 99 where slug = 'otra';

update app_info set value = '18' where key = 'schema_version';
