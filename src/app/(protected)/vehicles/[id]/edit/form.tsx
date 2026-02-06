'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  vehicle: {
    id: string
    plate_number: string
    driver_name: string | null
    national_id: string | null
    company_id: string | null
    equipment_type_id: string | null
    year_of_manufacture: number | null
    project: string | null
    gate: string | null
    status: string
    next_inspection_date: string | null
  }
  companies: { id: string; name: string }[]
  equipmentTypes: { id: string; name: string; category: string; classification: string | null }[]
}

const VEHICLE_STATUSES = [
  { value: 'verified', label: 'Verified' },
  { value: 'updated_inspection_required', label: 'Updated Inspection Required' },
  { value: 'inspection_overdue', label: 'Inspection Overdue' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'blacklisted', label: 'Blacklisted' },
]

export function EditVehicleForm({ vehicle, companies, equipmentTypes }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const fd = new FormData(e.currentTarget)

    const { error: updateError } = await supabase
      .from('vehicles_equipment')
      .update({
        plate_number: fd.get('plate_number') as string,
        driver_name: (fd.get('driver_name') as string) || null,
        national_id: (fd.get('national_id') as string) || null,
        company_id: (fd.get('company_id') as string) || null,
        equipment_type_id: (fd.get('equipment_type_id') as string) || null,
        year_of_manufacture: fd.get('year_of_manufacture') ? parseInt(fd.get('year_of_manufacture') as string) : null,
        project: (fd.get('project') as string) || null,
        gate: (fd.get('gate') as string) || null,
        status: fd.get('status') as string,
        next_inspection_date: (fd.get('next_inspection_date') as string) || null,
      })
      .eq('id', vehicle.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => {
      router.push('/vehicles')
      router.refresh()
    }, 1000)
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Plate Number *</label>
            <input name="plate_number" required className="glass-input" defaultValue={vehicle.plate_number} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Driver Name</label>
            <input name="driver_name" className="glass-input" defaultValue={vehicle.driver_name || ''} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">National ID</label>
            <input name="national_id" className="glass-input" defaultValue={vehicle.national_id || ''} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Year of Manufacture</label>
            <input name="year_of_manufacture" type="number" min="1990" max="2030" className="glass-input" defaultValue={vehicle.year_of_manufacture || ''} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Company</label>
          <select name="company_id" className="glass-input" defaultValue={vehicle.company_id || ''}>
            <option value="">Select company...</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Equipment Type</label>
          <select name="equipment_type_id" className="glass-input" defaultValue={vehicle.equipment_type_id || ''}>
            <option value="">Select type...</option>
            {equipmentTypes.map(e => <option key={e.id} value={e.id}>{e.name} ({e.category})</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Project</label>
            <input name="project" className="glass-input" defaultValue={vehicle.project || ''} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Gate</label>
            <input name="gate" className="glass-input" defaultValue={vehicle.gate || ''} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Status</label>
            <select name="status" className="glass-input" defaultValue={vehicle.status}>
              {VEHICLE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Next Inspection Date</label>
            <input name="next_inspection_date" type="date" className="glass-input" defaultValue={vehicle.next_inspection_date?.split('T')[0] || ''} />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">Vehicle updated successfully! Redirecting...</p>
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
