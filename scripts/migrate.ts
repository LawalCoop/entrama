/**
 * Aplica las migraciones pendientes contra POSTGRES_URL.
 *
 * Mismo comando para los dos destinos: apuntá la variable a PGlite local o a
 * Supabase y corré lo mismo. Corre en el build de Vercel antes de `next build`,
 * así que una migración que falla frena el deploy en vez de publicar código
 * contra un esquema que no existe.
 */
import { withClient } from '../lib/db.ts'
import { runMigrations } from '../lib/migrations.ts'

await withClient(async (client) => {
  const applied = await runMigrations(client)

  if (applied.length === 0) {
    console.log('Sin migraciones pendientes.')
    return
  }

  for (const name of applied) console.log(`✓ ${name}`)
  console.log(`${applied.length} migración(es) aplicada(s).`)
}).catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
