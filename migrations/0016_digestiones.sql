-- El resultado del clustering, para que /presentar lo use.
--
-- Se guarda el JSON entero y no una tabla de clusters normalizada: el agente
-- devuelve un documento, /presentar lo consume como un documento, y partirlo en
-- filas sería trabajo para volver a juntarlo del otro lado.
--
-- Una fila por subida, y se lee la última. Guardar el historial sale casi gratis
-- y deja volver a correr el prompt y comparar sin perder el anterior.

create table if not exists public.digestiones (
    id        uuid        primary key default gen_random_uuid(),
    creado_en timestamptz not null default now(),
    -- Los clusters tal como llegaron, más `member_ids`: los uuid reales de los
    -- problemas, resueltos al subir.
    --
    -- Resolverlos acá y no al leer es lo que hace que esto no se pudra: los refs
    -- son un prefijo del uuid y se alargan si dos colisionan, así que el mapa
    -- ref→problema depende de qué problemas existen. Si mañana se agrega o borra
    -- uno, una digestión vieja empezaría a apuntar a los problemas equivocados,
    -- en silencio.
    clusters  jsonb       not null,
    -- false si se subió forzando pese a que la validación falló: faltan
    -- problemas, hay refs inventados o duplicados. /presentar puede avisarlo.
    completa  boolean     not null default true
);

create index if not exists digestiones_creado_en_idx on public.digestiones (creado_en desc);

-- Mismo criterio que `problemas`: RLS sin policies. Esto sale por nuestra API,
-- detrás del proxy, no por la anon key.
alter table public.digestiones enable row level security;
revoke all on public.digestiones from anon, public;

update app_info set value = '16' where key = 'schema_version';
