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

-- Esta migración nació como `0005_migrations_rls.sql` y se renumeró: otra rama
-- creó su propio 0005 al mismo tiempo, y dos archivos con el mismo número dejan
-- ambigua la secuencia para quien venga después.
--
-- Renumerar algo ya aplicado normalmente es mala idea, porque todos los entornos
-- que lo corrieron lo vuelven a correr. Acá es seguro por dos razones: el cuerpo
-- es idempotente —activar RLS y revocar permisos dos veces no cambia nada— y los
-- únicos entornos que existen son la base local y Supabase.
--
-- El registro viejo se borra acá mismo para que `_migrations` no quede con un
-- fantasma que ya no corresponde a ningún archivo del repo. En una base nueva
-- este delete no encuentra nada y no hace daño.
delete from _migrations where name = '0005_migrations_rls.sql';

update app_info set value = '7' where key = 'schema_version';
