-- Las actividades pasan a ser una tabla.
--
-- Eran cuatro constantes adentro de dinamica.html, así que sumar una era editar
-- el HTML y deployar. Al anotarse hay gente que no encaja en ninguna —y no se
-- sabe de antemano en cuál— así que ahora el formulario ofrece "Otra", y lo que
-- se escriba ahí queda disponible para quien se anote después.
--
-- Mismo criterio que el catálogo de organizaciones: una sola lista, que crece
-- sola con lo que la gente carga.

create table if not exists public.actividades (
    id     uuid primary key default gen_random_uuid(),
    nombre text    not null,
    -- 999 y no 0 para que las que se den de alta en el momento queden al final
    -- de la lista, después de las cuatro que vienen cargadas, en vez de
    -- colarse arriba.
    orden  integer default 999,
    activa boolean default true
);

-- El slug deduplica y además es lo que se guarda en `facttic_participantes.
-- actividades`. La fórmula tiene que dar exactamente los valores que ya están
-- guardados desde la 0005 —'agricola', 'producto-elaborado', 'tecnologia',
-- 'comercializacion'—, o los participantes ya anotados quedarían apuntando a
-- actividades que no existen.
--
-- Por eso, a diferencia del slug de cooperativas, este además reemplaza los
-- espacios por guiones: "Producto elaborado" tiene que caer en
-- 'producto-elaborado' y no en 'producto elaborado'.
alter table public.actividades
  add column if not exists slug text
  generated always as (
    regexp_replace(
      lower(trim(translate(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'))),
      '\s+', '-', 'g'
    )
  ) stored;

create unique index if not exists actividades_slug_idx on public.actividades (slug);

insert into public.actividades (nombre, orden) values
  ('Agrícola', 1),
  ('Producto elaborado', 2),
  ('Tecnología', 3),
  ('Comercialización', 4)
on conflict (slug) do nothing;

alter table public.actividades enable row level security;

-- Lectura para todos, y alta abierta: el formulario da de alta la que falte,
-- igual que hace con las organizaciones. Borrar y editar no: para eso está el
-- panel, y una lista que cualquiera pueda vaciar en vivo es peor que una con
-- alguna repetida. `activa` es la palanca para bajar una sin borrarla.
create policy "actividades: lectura" on public.actividades for select to anon using (true);
create policy "actividades: alta"    on public.actividades for insert to anon with check (true);

grant usage on schema public to anon;
grant select, insert on public.actividades to anon;

-- Realtime, para que una actividad nueva le aparezca a quien ya tiene el
-- formulario abierto sin que recargue. La publicación la crea Supabase; en
-- PGlite no existe y sin la guarda esto se caería en local.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.actividades';
  end if;
end $$;

update app_info set value = '10' where key = 'schema_version';
