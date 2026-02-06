import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md w-full text-center space-y-4">
        <p className="text-6xl font-bold text-gray-200">404</p>
        <h2 className="text-lg font-semibold text-gray-900">Page not found</h2>
        <p className="text-sm text-gray-500">The page you are looking for does not exist or has been moved.</p>
        <Link href="/dashboard" className="btn-primary inline-block">
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
