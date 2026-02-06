'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
        <p className="text-sm text-gray-500">An unexpected error occurred. Please try again.</p>
        {error.digest && (
          <p className="text-xs text-gray-400 font-mono">Error ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="btn-primary mx-auto"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
