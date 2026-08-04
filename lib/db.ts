import { Client, type ClientConfig } from 'pg'

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
function connectionConfig(raw: string): ClientConfig {
  const url = new URL(raw)

  if (!url.searchParams.has('sslmode')) {
    return { connectionString: url.toString() }
  }

  const ca = process.env.SUPABASE_CA_CERT
  if (ca) {
    url.searchParams.delete('sslmode')
    return { connectionString: url.toString(), ssl: { ca } }
  }

  url.searchParams.set('sslmode', 'no-verify')
  return { connectionString: url.toString() }
}

/** Opens a connection, hands it to `fn`, and always closes it. */
export async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const raw = process.env.POSTGRES_URL
  if (!raw) throw new Error('POSTGRES_URL is not set')

  const client = new Client(connectionConfig(raw))

  try {
    await client.connect()
    return await fn(client)
  } finally {
    await client.end().catch(() => {})
  }
}
