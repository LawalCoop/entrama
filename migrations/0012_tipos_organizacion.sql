-- Los tipos de organización pasan a ser una tabla.
--
-- Eran una constante adentro de dinamica.html, y ahora los necesita también el
-- paso 1 de /recolectar. Copiarlos a nuestro lado los dejaría en dos lugares,
-- que es la clase de duplicado que se desincroniza sin que nadie se entere.
-- Mismo camino que hizo la 0010 con las actividades.

create table if not exists public.tipos_organizacion (
    id     uuid primary key default gen_random_uuid(),
    nombre text    not null,
    -- 999 y no 0 para que los que se den de alta después queden al final, en
    -- vez de colarse entre los que vienen cargados.
    orden  integer default 999,
    activa boolean default true
);

-- El slug es lo que se guarda en `facttic_participantes.tipo_organizacion` y en
-- `problemas.tipo_organizacion`, así que la fórmula tiene que dar exactamente
-- los valores que ya están guardados desde la 0005 —'cooperativa',
-- 'estado-municipal', etc.— o los participantes ya anotados quedarían apuntando
-- a tipos que no existen. Es la misma de actividades, guiones incluidos.
alter table public.tipos_organizacion
  add column if not exists slug text
  generated always as (
    regexp_replace(
      lower(trim(translate(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'))),
      '\s+', '-', 'g'
    )
  ) stored;

create unique index if not exists tipos_organizacion_slug_idx on public.tipos_organizacion (slug);

-- Los nombres están elegidos para que el slug dé el valor que ya se guarda:
-- "Estado municipal" -> 'estado-municipal'.
--
-- Ese prefijo `estado-` no es cosmético: `facttic_participantes.
-- familia_organizacion` (0005) lo usa para que los tres niveles del Estado
-- cuenten como uno solo al armar equipos —un equipo con alguien de un municipio
-- y alguien de una provincia no es diverso, es dos veces Estado—. Si algún día
-- hace falta un cuarto nivel, tiene que respetar el prefijo.
--
-- Un tipo nuevo que no sea del Estado no necesita nada especial: queda como su
-- propia familia, que es justamente lo correcto.
insert into public.tipos_organizacion (nombre, orden) values
  ('Cooperativa',         1),
  ('Organización',        2),
  ('Mutual',              3),
  ('Universidad',         4),
  ('Estado municipal',    5),
  ('Estado provincial',   6),
  ('Estado nacional',     7),
  ('Otra',                8)
on conflict (slug) do nothing;

alter table public.tipos_organizacion enable row level security;

-- Mismos permisos que `actividades` después de la 0011: lectura, alta, edición
-- y baja para anon. No es un permiso nuevo en la práctica —el panel usa la misma
-- anon key que los participantes— y ser más estricto acá solo dejaría afuera a
-- quien conduce.
create policy "tipos_organizacion: lectura" on public.tipos_organizacion for select to anon using (true);
create policy "tipos_organizacion: alta"    on public.tipos_organizacion for insert to anon with check (true);
create policy "tipos_organizacion: edición" on public.tipos_organizacion for update to anon using (true);
create policy "tipos_organizacion: baja"    on public.tipos_organizacion for delete to anon using (true);

grant usage on schema public to anon;
grant select, insert, update, delete on public.tipos_organizacion to anon;

-- Realtime, para que un tipo nuevo aparezca sin recargar. La publicación la crea
-- Supabase; en PGlite no existe y sin la guarda esto se caería en local.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.tipos_organizacion';
  end if;
end $$;

update app_info set value = '12' where key = 'schema_version';
