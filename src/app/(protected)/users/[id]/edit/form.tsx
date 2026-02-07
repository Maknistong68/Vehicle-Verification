'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  currentRole: string
  userName: string
  isActive: boolean
  companies: { id: string; name: string }[]
  currentCompanyId: string | null
}

export function EditRoleForm({ userId, currentRole, userName, isActive, companies, currentCompanyId }: Props) {
  const [role, setRole] = useState(currentRole)
  const [active, setActive] = useState(isActive)
  const [companyId, setCompanyId] = useState(currentCompanyId || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (role === 'contractor' && !companyId) {
      setError('Company is required for contractors')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        role,
        is_active: active,
        company_id: role === 'contractor' ? companyId : null,
      })
      .eq('id', userId)

    if (updateError) {
      setError('Failed to update user. Please try again.')
      setLoading(false)
      return
    }

    router.push('/users')
    router.refresh()
  }

  return (
    <div className="max-w-md">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        <div>
          <p className="text-sm text-gray-400">User</p>
          <p className="text-gray-900 font-medium">{userName}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Role</label>
          <select value={role} onChange={e => setRole(e.target.value)} className="glass-input">
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="inspector">Inspector</option>
            <option value="contractor">Contractor</option>
            <option value="verifier">Internal Verifier</option>
          </select>
        </div>

        {role === 'contractor' && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Company *</label>
            <select
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
              required
              className="glass-input"
            >
              <option value="">Select company...</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Contractors can only view vehicles from their assigned company.</p>
          </div>
        )}

        <div className="flex items-center gap-3 min-h-[44px]">
          <input type="checkbox" id="active" checked={active} onChange={e => setActive(e.target.checked)} className="rounded" />
          <label htmlFor="active" className="text-sm text-gray-600">Active</label>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
