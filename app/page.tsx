import { checkDb } from '@/lib/db'

// Check on every request, so the badge reflects the database now rather than
// whatever was true when the page was built.
export const dynamic = 'force-dynamic'

export default async function Page() {
  const db = await checkDb()

  return (
    <main style={{ width: '100%', maxWidth: '34rem' }}>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '2rem', letterSpacing: '-0.02em' }}>
        Hello world
      </h1>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          padding: '1rem 1.25rem',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            color: db.ok ? 'var(--ok)' : 'var(--fail)',
            fontSize: '1.25rem',
            lineHeight: 1.35,
          }}
        >
          {db.ok ? '✓' : '✕'}
        </span>

        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {db.ok ? 'Database connected' : 'Database unreachable'}
          </p>
          <p
            style={{
              margin: '0.35rem 0 0',
              fontSize: '0.8125rem',
              color: 'var(--muted)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              overflowWrap: 'anywhere',
            }}
          >
            {db.ok
              ? `${db.version.split(' on ')[0]} · ${db.latencyMs}ms · TLS ${
                  db.verified ? 'verified' : 'unverified'
                }`
              : db.error}
          </p>
        </div>
      </div>
    </main>
  )
}
