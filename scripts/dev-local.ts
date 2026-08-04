/**
 * Levanta todo el entorno local con un solo comando: base, migraciones y app.
 *
 * PGlite es Postgres compilado a WASM, corriendo dentro de este proceso — no
 * hace falta Docker ni ningún servicio. Como habla el protocolo nativo de
 * Postgres por socket, el cliente `pg` de la app se conecta igual que a
 * Supabase: cambia el connection string y nada más.
 *
 * Los datos se persisten en .pglite/, así que sobreviven a los reinicios.
 */
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { Client } from 'pg'
import { runMigrations } from '../lib/migrations.ts'

const PORT = Number(process.env.PGLITE_PORT ?? 5439)
const HOST = '127.0.0.1'
const ROOT = join(import.meta.dirname, '..')
const DATA_DIR = join(ROOT, '.pglite')
const POSTGRES_URL = `postgres://postgres@${HOST}:${PORT}/postgres`

const db = await PGlite.create({ dataDir: DATA_DIR })
const server = new PGLiteSocketServer({ db, port: PORT, host: HOST })
await server.start()
console.log(`Base local en ${POSTGRES_URL} (datos en .pglite/)`)

const migrator = new Client({ connectionString: POSTGRES_URL })
await migrator.connect()
try {
  const applied = await runMigrations(migrator)
  console.log(applied.length ? `Migraciones aplicadas: ${applied.join(', ')}` : 'Esquema al día.')
} finally {
  await migrator.end().catch(() => {})
}

const next = spawn(join(ROOT, 'node_modules', '.bin', 'next'), ['dev'], {
  stdio: 'inherit',
  env: { ...process.env, POSTGRES_URL },
})

const shutdown = async (code: number) => {
  await server.stop().catch(() => {})
  await db.close().catch(() => {})
  process.exit(code)
}

next.on('exit', (code) => shutdown(code ?? 0))
process.on('SIGINT', () => next.kill('SIGINT'))
process.on('SIGTERM', () => next.kill('SIGTERM'))
