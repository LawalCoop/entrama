import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Client } from 'pg'

const MIGRATIONS_DIR = join(import.meta.dirname, '..', 'migrations')

/**
 * Aplica las migraciones pendientes y devuelve cuáles corrió.
 *
 * Cada una va en su propia transacción, así que una que falla no deja el
 * esquema a medias. El registro en `_migrations` hace que correr esto de más
 * sea inofensivo: lo ya aplicado se saltea.
 */
export async function runMigrations(client: Client): Promise<string[]> {
  await client.query(`
    create table if not exists _migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  const { rows } = await client.query<{ name: string }>('select name from _migrations')
  const applied = new Set(rows.map((r) => r.name))

  const files = await readdir(MIGRATIONS_DIR)
  const pending = files.filter((f) => f.endsWith('.sql') && !applied.has(f)).sort()

  for (const name of pending) {
    const sql = await readFile(join(MIGRATIONS_DIR, name), 'utf8')
    try {
      await client.query('begin')
      await client.query(sql)
      await client.query('insert into _migrations (name) values ($1)', [name])
      await client.query('commit')
    } catch (err) {
      await client.query('rollback').catch(() => {})
      throw new Error(`${name} falló: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return pending
}
