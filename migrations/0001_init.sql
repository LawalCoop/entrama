-- Primera migración.
--
-- Todavía no hay dominio: recolección y presentación no tienen tablas propias.
-- Esta migración existe para que el esquema empiece a viajar en el repo, y para
-- poder verificar de punta a punta que la misma definición llega igual a PGlite
-- en local y a Supabase en producción.

create table if not exists app_info (
  key   text primary key,
  value text not null
);

-- RLS activo desde el arranque: app_info vive en el schema `public`, que puede
-- quedar expuesto por la Data API de Supabase. Sin políticas, nadie que entre
-- por ahí lee nada. La app se conecta por Postgres directo, no por la Data API.
alter table app_info enable row level security;

insert into app_info (key, value)
values ('schema_version', '1')
on conflict (key) do update set value = excluded.value;
