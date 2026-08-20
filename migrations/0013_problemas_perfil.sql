-- `problemas` suma los campos de perfil que ya pide la dinámica.
--
-- El paso 1 de /recolectar pasa a preguntar lo mismo que el registro de
-- dinamica.html: además de nombre y organización, provincia, tipo y actividades.
--
-- Nullables, a diferencia de la dinámica. Allá provincia y tipo son obligatorios
-- porque el reparto de equipos los usa para mezclar; acá no cumplen ninguna
-- función, son perfil. Y /recolectar es anónimo y voluntario: cada campo
-- obligatorio de más es gente que abandona antes de contar su problema.
--
-- Van en el problema y no en `cooperativas` por el mismo motivo que la 0005 los
-- puso en el participante: el catálogo es público y editable, así que un dato
-- equivocado ahí se propagaría a todas las personas de esa organización. Acá
-- cada quien declara lo suyo.
alter table public.problemas
  add column if not exists provincia         text,
  add column if not exists tipo_organizacion text,
  add column if not exists actividades       text[];

update app_info set value = '13' where key = 'schema_version';
