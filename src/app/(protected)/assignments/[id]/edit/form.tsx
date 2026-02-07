'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { sanitizeText } from '@/lib/sanitize'

interface Props {
  assignment: {
    id: string
    company_id: string
    inspector_id: string | null
    scheduled_date: string
    status: string
    notes: string | null
  }
  companies: { id: string; name: string }[]
  inspectors: { id: string; full_name: string }[]
}

export function EditAssignmentForm({ assignment, companies, inspectors }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Format datetime-local value
  const scheduledDateLocal = assignment.scheduled_date
    ? new Date(assignment.scheduled_date).toISOString().slice(0, 16)
    : ''

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const fd = new FormData(e.currentTarget)
    const newDate = fd.get('scheduled_date') as string

    // Auto-set status to 'rescheduled' if date changed
    const dateChanged = newDate !== scheduledDateLocal
    const updateData: Record<string, unknown> = {
      company_id: fd.get('company_id') as string,
      inspector_id: (fd.get('inspector_id') as string) || null,
      scheduled_date: newDate,
      notes: sanitizeText(fd.get('notes') as string).slice(0, 1000) || null,
    }
    if (dateChanged && assignment.status === 'assigned') {
      updateData.status = 'rescheduled'
    }

    const { error: updateError } = await supabase
      .from('assignments')
      .update(updateData)
      .eq('id', assignment.id)

    if (updateError) {
      setError('Failed to update assignment. Please try again.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => {
      router.push(`/assignments/${assignment.id}`)
      router.refresh()
    }, 1000)
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Company</label>
          <select name="company_id" required className="glass-input" defaultValue={assignment.company_id}>
            <option value="">Select company...</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Assign Inspector</label>
          <select name="inspector_id" className="glass-input" defaultValue={assignment.inspector_id || ''}>
            <option value="">Select inspector (optional)...</option>
            {inspectors.map(i => (
              <option key={i.id} value={i.id}>{i.full_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Scheduled Date &amp; Time</label>
          <input type="datetime-local" name="scheduled_date" required className="glass-input" defaultValue={scheduledDateLocal} />
          <p className="text-xs text-gray-400 mt-1">Changing the date will auto-set status to "rescheduled"</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Notes (optional)</label>
          <textarea name="notes" rows={3} className="glass-input" defaultValue={assignment.notes || ''} placeholder="Additional notes..." />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">Assignment updated successfully! Redirecting...</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
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
