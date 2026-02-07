'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { sanitizeText } from '@/lib/sanitize'

interface Props {
  companies: { id: string; name: string }[]
  inspectors: { id: string; full_name: string }[]
}

export function CreateAssignmentForm({ companies, inspectors }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase
      .from('assignments')
      .insert({
        company_id: fd.get('company_id') as string,
        inspector_id: (fd.get('inspector_id') as string) || null,
        scheduled_date: fd.get('scheduled_date') as string,
        assigned_by: user?.id,
        status: 'assigned',
        notes: sanitizeText(fd.get('notes') as string).slice(0, 1000) || null,
      })

    if (insertError) {
      setError('Failed to create assignment. Please try again.')
      setLoading(false)
      return
    }

    router.push('/assignments')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Company</label>
          <select name="company_id" required className="glass-input">
            <option value="">Select company...</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Assign Inspector</label>
          <select name="inspector_id" className="glass-input">
            <option value="">Select inspector (optional)...</option>
            {inspectors.map(i => (
              <option key={i.id} value={i.id}>{i.full_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Scheduled Date &amp; Time</label>
          <input type="datetime-local" name="scheduled_date" required className="glass-input" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Notes (optional)</label>
          <textarea name="notes" rows={3} className="glass-input" placeholder="Additional notes..." />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Assignment'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
