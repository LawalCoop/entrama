-- La tabla que faltaba: hasta acá el wizard de /recolectar posteaba a un
-- endpoint que respondía ok y descartaba todo.
--
-- Una fila por envío, con el nombre y la cooperativa copiados adentro. No hay
-- tablas de personas ni de organizaciones a propósito: el formulario es público
-- y anónimo, los dos campos son texto libre sin nada que garantice que dos
-- envíos que dicen "CALF" hablen de la misma cooperativa, y deduplicar a ciegas
-- inventaría una identidad que el dato no tiene. Guardar lo que la persona
-- escribió es la lectura fiel de lo que pasó.

create table if not exists problemas (
  id          uuid        primary key default gen_random_uuid(),
  creado_en   timestamptz not null default now(),
  nombre      text        not null,
  cooperativa text        not null,
  -- Del listado del paso 2 o escrita a mano: ese paso ofrece "Otra" con texto
  -- libre, así que no hay check contra una lista cerrada.
  area        text        not null,
  problema    text        not null,
  frecuencia  text        not null,
  impacto     text        not null
);

-- Para leer lo recolectado, que siempre va a ser "lo último primero".
create index if not exists problemas_creado_en_idx on problemas (creado_en desc);

-- Mismo criterio que app_info en 0001: la tabla vive en `public`, que la Data
-- API de Supabase puede exponer. Sin políticas, por ahí no entra nadie. La app
-- se conecta por Postgres directo, que no pasa por RLS.
alter table problemas enable row level security;

update app_info set value = '2' where key = 'schema_version';
