import { Client, type ClientConfig } from 'pg'

export type DbStatus =
  | { ok: true; version: string; latencyMs: number; verified: boolean; schemaVersion: string | null }
  | { ok: false; error: string }

/**
 * Builds the `pg` client config from POSTGRES_URL.
 *
 * The rule is: only touch TLS if the URL already asked for it. A URL without
 * `sslmode` means "no TLS" (local PGlite, which does not speak it), not "decide
 * for me". That keeps the connection policy in the environment variable, where
 * it belongs, instead of half here and half there.
 *
 * When the URL does ask for TLS, `sslmode` has to come out before we can pass a
 * CA: while it is present, `pg` derives its whole TLS config from the connection
 * string and ignores the `ssl` option. With it gone, Node's defaults apply —
 * verify the chain against `ca` and check the hostname.
 */
export function connectionConfig(raw: string): ClientConfig & { verified: boolean } {
  const url = new URL(raw)

  if (!url.searchParams.has('sslmode')) {
    return { connectionString: url.toString(), verified: false }
  }

  const ca = process.env.SUPABASE_CA_CERT
  if (ca) {
    url.searchParams.delete('sslmode')
    return { connectionString: url.toString(), ssl: { ca }, verified: true }
  }

  url.searchParams.set('sslmode', 'no-verify')
  return { connectionString: url.toString(), verified: false }
}

/** Opens a connection, hands it to `fn`, and always closes it. */
export async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const raw = process.env.POSTGRES_URL
  if (!raw) throw new Error('POSTGRES_URL is not set')

  const { verified: _verified, ...config } = connectionConfig(raw)
  const client = new Client(config)

  try {
    await client.connect()
    return await fn(client)
  } finally {
    await client.end().catch(() => {})
  }
}

/**
 * Opens a real connection and reports what answered.
 *
 * Queries the database directly rather than the Data API, so a green check
 * means Postgres itself replied — not just that PostgREST is reachable.
 */
export async function checkDb(): Promise<DbStatus> {
  const raw = process.env.POSTGRES_URL
  if (!raw) return { ok: false, error: 'POSTGRES_URL is not set' }

  const { verified } = connectionConfig(raw)
  const started = performance.now()

  try {
    return await withClient(async (client) => {
      const { rows } = await client.query<{ version: string }>('select version()')

      // Present only once the first migration has run; absent is not an error.
      const schema = await client
        .query<{ value: string }>("select value from app_info where key = 'schema_version'")
        .catch(() => null)

      return {
        ok: true as const,
        version: rows[0].version,
        latencyMs: Math.round(performance.now() - started),
        verified,
        schemaVersion: schema?.rows[0]?.value ?? null,
      }
    })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
