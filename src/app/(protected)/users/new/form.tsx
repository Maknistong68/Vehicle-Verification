'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  currentUserRole: string
  companies: { id: string; name: string }[]
}

export function CreateUserForm({ currentUserRole, companies }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')
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
        company_id: selectedRole === 'contractor' ? fd.get('company_id') || null : null,
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
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-green-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-emerald-700 font-medium">User created successfully!</p>
          <p className="text-sm text-gray-400 mt-1">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Full Name *</label>
            <input name="full_name" required className="glass-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Email *</label>
            <input name="email" type="email" required autoComplete="email" className="glass-input" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Password *</label>
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className="glass-input" placeholder="Min 8 chars, upper+lower+number" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Phone</label>
            <input name="phone" type="tel" className="glass-input" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Role *</label>
          <select
            name="role"
            required
            className="glass-input"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">Select role...</option>
            {availableRoles.map(r => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>

        {selectedRole === 'contractor' && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Company *</label>
            <select name="company_id" required className="glass-input">
              <option value="">Select company...</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Contractors can only view vehicles from their assigned company.</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
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
