import { Client } from 'pg'

export type DbStatus =
  | { ok: true; version: string; latencyMs: number; verified: boolean }
  | { ok: false; error: string }

/**
 * Supabase's pooler presents a chain rooted in Supabase's own CA, which is not
 * in the system trust store. `pg` reads the `sslmode=require` that Vercel puts
 * in POSTGRES_URL as `verify-full`, so the handshake fails with "self-signed
 * certificate in certificate chain". Passing an `ssl` option does not help —
 * the connection string wins.
 *
 * With SUPABASE_CA_CERT set (Dashboard → Project Settings → Database → SSL
 * Configuration) we verify the full chain against it. Without it, we downgrade
 * to `no-verify`: still encrypted, but the chain is not checked.
 */
function connectionConfig(raw: string) {
  const url = new URL(raw)
  const ca = process.env.SUPABASE_CA_CERT

  if (ca) {
    // Drop sslmode entirely: while it is present, `pg` derives TLS config from
    // the connection string and ignores the `ssl` option — including our CA.
    // With it gone, Node's defaults apply: verify the chain against `ca` and
    // check the hostname.
    url.searchParams.delete('sslmode')
    return { connectionString: url.toString(), ssl: { ca }, verified: true }
  }

  url.searchParams.set('sslmode', 'no-verify')
  return { connectionString: url.toString(), verified: false }
}

/**
 * Opens a real connection to Postgres and runs a trivial query.
 *
 * Uses POSTGRES_URL (Supabase transaction pooler, port 6543) rather than the
 * Data API, so a green check means the database itself answered — not just
 * that PostgREST is reachable.
 */
export async function checkDb(): Promise<DbStatus> {
  const raw = process.env.POSTGRES_URL
  if (!raw) {
    return { ok: false, error: 'POSTGRES_URL is not set' }
  }

  const { verified, ...clientConfig } = connectionConfig(raw)
  const client = new Client(clientConfig)
  const started = performance.now()

  try {
    await client.connect()
    const { rows } = await client.query<{ version: string }>('select version()')
    return {
      ok: true,
      version: rows[0].version,
      latencyMs: Math.round(performance.now() - started),
      verified,
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    await client.end().catch(() => {})
  }
}
