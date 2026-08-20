-- `problemas` guarda de qué dispositivo vino cada envío.
--
-- El wizard de /recolectar pasa a precargarse con lo que la dinámica dejó en
-- localStorage —las dos apps viven en el mismo origen, así que comparten
-- almacenamiento—, y de paso manda el mismo `facttic_device_id`. Con eso los
-- varios problemas de una misma persona quedan relacionados, y se pueden cruzar
-- con su participación en la dinámica.
--
-- No es una práctica nueva: `facttic_participantes` guarda ese mismo id desde la
-- 0003. Allá además hace un trabajo —es cómo la app te reconoce al volver—; acá
-- es solo para poder leer después quién cargó qué.
--
-- Nullable porque los envíos que ya están no lo tienen, y porque el wizard sigue
-- funcionando si el navegador tiene el almacenamiento bloqueado.
alter table public.problemas
  add column if not exists device_id text;

create index if not exists problemas_device_id_idx on public.problemas (device_id);

update app_info set value = '14' where key = 'schema_version';
