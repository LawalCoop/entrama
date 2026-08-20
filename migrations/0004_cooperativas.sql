-- El catálogo de cooperativas deja de ser de FACTTIC y pasa a ser compartido.
--
-- Nació como `facttic_cooperativas` porque llegó con la dinámica, pero
-- /recolectar necesita las mismas sugerencias, y tener dos listas de las mismas
-- cooperativas conviviendo es la clase de cosa que en seis meses nadie sabe cuál
-- es la buena. Una sola tabla: lo que se escribe en un lado sugiere en el otro.
--
-- Las policies y la pertenencia a la publicación de realtime siguen a la tabla
-- en un rename —van pegadas a la relación, no al nombre— así que no hay que
-- rehacerlas.

alter table public.facttic_cooperativas rename to cooperativas;

-- El slug es una columna generada y no algo que calcule cada cliente: si lo
-- computara el que inserta, nuestro backend y dinamica.html tendrían que
-- coincidir en cómo se normaliza, y el día que uno de los dos cambie aparecen
-- duplicados que nadie entiende. Acá lo decide Postgres y punto.
--
-- `translate` en vez de `unaccent` porque unaccent es una extensión: puede no
-- estar instalada, y esto tiene que correr igual en PGlite local que en
-- Supabase. Cubre los acentos del español, que es lo que hay en estos nombres.
alter table public.cooperativas
  add column if not exists slug text
  generated always as (
    lower(trim(translate(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')))
  ) stored;

-- Deduplica "CALF", " calf " y "Calf" en una sola fila. "Coop. CALF" no: eso ya
-- es otro nombre, y adivinar que son la misma sería inventar.
create unique index if not exists cooperativas_slug_idx on public.cooperativas (slug);

update app_info set value = '4' where key = 'schema_version';
