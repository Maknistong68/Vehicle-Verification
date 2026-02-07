'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const timedOut = searchParams.get('reason') === 'timeout'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Rate-limit check first
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.status === 429) {
        const data = await res.json()
        setError(data.error || 'Too many attempts. Please try again later.')
        setLoading(false)
        return
      }
    } catch {
      // Rate-limit check failed — proceed with auth anyway
    }

    // Auth via Supabase browser client (handles cookies automatically)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="glass-card p-6 md:p-8 shadow-lg">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 mb-4 shadow-md">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">VVS Inspection</h1>
        <p className="text-gray-500 mt-1 text-sm">Vehicle & Equipment Inspection Management</p>
      </div>

      {timedOut && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <p className="text-sm text-yellow-700">Your session expired due to inactivity. Please sign in again.</p>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1.5">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="glass-input"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="glass-input"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-400">
        Authorized personnel only. All access is logged and monitored.
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="glass-card p-6 md:p-8 shadow-lg animate-pulse h-96" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
