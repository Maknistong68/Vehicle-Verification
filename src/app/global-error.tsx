'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0a0a0f', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Something went wrong</h2>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>
              A critical error occurred. Please try again.
            </p>
            {error.digest && (
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginBottom: '1rem' }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{ padding: '0.5rem 1.5rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
