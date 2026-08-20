-- `_migrations` era la única tabla de `public` sin RLS.
--
-- La crea `lib/migrations.ts` con un `create table if not exists`, no una
-- migración, así que nunca pasó por la decisión de activarla y quedó afuera sin
-- que nadie lo decidiera. Con la anon key —que está a la vista en los HTML de
-- /live— se podían leer los nombres de las migraciones y cuándo se aplicaron.
--
-- No hay datos de nadie ahí, pero es superficie pública que nadie abrió a
-- propósito, y los nombres de archivo cuentan qué tiene adentro el esquema.
--
-- No afecta a las migraciones: `scripts/migrate.ts` se conecta como dueño de la
-- tabla, y RLS no se le aplica al dueño salvo que se fuerce con
-- `force row level security`.
alter table _migrations enable row level security;

-- Explícito además del RLS: Supabase define default privileges que le dan
-- permisos a anon sobre las tablas nuevas de `public`, y esta los heredó.
revoke all on _migrations from anon, public;

update app_info set value = '5' where key = 'schema_version';
