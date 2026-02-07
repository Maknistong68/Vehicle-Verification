'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Rate-limit check first
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.status === 429) {
        const data = await res.json()
        setError(data.error || 'Too many requests. Please try again later.')
        setLoading(false)
        return
      }
    } catch {
      // Rate-limit check failed — proceed anyway
    }

    // Send reset email via Supabase
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`

    await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    // Always show success message regardless of whether email exists (prevents enumeration)
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-6 md:p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 mb-4 shadow-md">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reset Password</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {submitted
                ? 'Check your email for a reset link'
                : 'Enter your email to receive a password reset link'}
            </p>
          </div>

          {submitted ? (
            <div className="space-y-5">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-700">
                  If an account exists with that email, you will receive a password reset link shortly. Please check your inbox and spam folder.
                </p>
              </div>
              <Link
                href="/login"
                className="block w-full text-center btn-primary"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <Link
                href="/login"
                className="block text-center text-sm text-emerald-600 hover:text-emerald-500 font-medium"
              >
                Back to Sign In
              </Link>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-gray-400">
            Authorized personnel only. All access is logged and monitored.
          </p>
        </div>
      </div>
    </div>
  )
}
