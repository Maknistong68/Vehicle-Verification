'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  appointment: {
    id: string
    vehicle_equipment_id: string
    inspector_id: string | null
    scheduled_date: string
    status: string
    notes: string | null
  }
  vehicles: { id: string; plate_number: string; driver_name: string | null }[]
  inspectors: { id: string; full_name: string }[]
}

export function EditAppointmentForm({ appointment, vehicles, inspectors }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Format datetime-local value
  const scheduledDateLocal = appointment.scheduled_date
    ? new Date(appointment.scheduled_date).toISOString().slice(0, 16)
    : ''

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const fd = new FormData(e.currentTarget)

    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        vehicle_equipment_id: fd.get('vehicle_id') as string,
        inspector_id: (fd.get('inspector_id') as string) || null,
        scheduled_date: fd.get('scheduled_date') as string,
        notes: (fd.get('notes') as string) || null,
      })
      .eq('id', appointment.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => {
      router.push('/appointments')
      router.refresh()
    }, 1000)
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Vehicle / Equipment</label>
          <select name="vehicle_id" required className="glass-input" defaultValue={appointment.vehicle_equipment_id}>
            <option value="">Select vehicle or equipment...</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.plate_number} — {v.driver_name || 'No driver'}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Assign Inspector</label>
          <select name="inspector_id" className="glass-input" defaultValue={appointment.inspector_id || ''}>
            <option value="">Select inspector (optional)...</option>
            {inspectors.map(i => (
              <option key={i.id} value={i.id}>{i.full_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Scheduled Date &amp; Time</label>
          <input type="datetime-local" name="scheduled_date" required className="glass-input" defaultValue={scheduledDateLocal} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Notes (optional)</label>
          <textarea name="notes" rows={3} className="glass-input" defaultValue={appointment.notes || ''} placeholder="Additional notes..." />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">Appointment updated successfully! Redirecting...</p>
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
