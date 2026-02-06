'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CreateUserForm({ currentUserRole }: { currentUserRole: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const availableRoles = currentUserRole === 'owner'
    ? ['admin', 'inspector', 'contractor', 'verifier']
    : ['inspector', 'contractor', 'verifier']

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)

    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: fd.get('email'),
        password: fd.get('password'),
        full_name: fd.get('full_name'),
        role: fd.get('role'),
        phone: fd.get('phone') || null,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Failed to create user')
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push('/users')
      router.refresh()
    }, 1500)
  }

  if (success) {
    return (
      <div className="max-w-2xl">
        <div className="glass-card border-emerald-400/25 p-6 text-center">
          <svg className="w-12 h-12 text-green-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-emerald-300 font-medium">User created successfully!</p>
          <p className="text-sm text-white/40 mt-1">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Full Name *</label>
            <input name="full_name" required className="glass-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Email *</label>
            <input name="email" type="email" required className="glass-input" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Password *</label>
            <input name="password" type="password" required minLength={8} className="glass-input" placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Phone</label>
            <input name="phone" type="tel" className="glass-input" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Role *</label>
          <select name="role" required className="glass-input">
            <option value="">Select role...</option>
            {availableRoles.map(r => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="p-3 glass-card border-red-400/25">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create User'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
