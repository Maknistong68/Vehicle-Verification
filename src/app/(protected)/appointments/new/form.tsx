'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  vehicles: { id: string; plate_number: string; driver_name: string | null }[]
  inspectors: { id: string; full_name: string }[]
}

export function CreateAppointmentForm({ vehicles, inspectors }: Props) {
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
      .from('appointments')
      .insert({
        vehicle_equipment_id: fd.get('vehicle_id') as string,
        inspector_id: (fd.get('inspector_id') as string) || null,
        scheduled_date: fd.get('scheduled_date') as string,
        scheduled_by: user?.id,
        status: 'scheduled',
        notes: (fd.get('notes') as string) || null,
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push('/appointments')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Vehicle / Equipment</label>
          <select name="vehicle_id" required className="glass-input">
            <option value="">Select vehicle or equipment...</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.plate_number} — {v.driver_name || 'No driver'}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Assign Inspector</label>
          <select name="inspector_id" className="glass-input">
            <option value="">Select inspector (optional)...</option>
            {inspectors.map(i => (
              <option key={i.id} value={i.id}>{i.full_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Scheduled Date &amp; Time</label>
          <input type="datetime-local" name="scheduled_date" required className="glass-input" />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Notes (optional)</label>
          <textarea name="notes" rows={3} className="glass-input" placeholder="Additional notes..." />
        </div>

        {error && (
          <div className="p-3 glass-card border-red-400/25">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Appointment'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
