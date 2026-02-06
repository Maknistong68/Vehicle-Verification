'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  companies: { id: string; name: string }[]
  equipmentTypes: { id: string; name: string; category: string; classification: string | null }[]
}

export function AddVehicleForm({ companies, equipmentTypes }: Props) {
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
      .from('vehicles_equipment')
      .insert({
        plate_number: fd.get('plate_number') as string,
        driver_name: (fd.get('driver_name') as string) || null,
        national_id: (fd.get('national_id') as string) || null,
        company_id: (fd.get('company_id') as string) || null,
        equipment_type_id: (fd.get('equipment_type_id') as string) || null,
        year_of_manufacture: fd.get('year_of_manufacture') ? parseInt(fd.get('year_of_manufacture') as string) : null,
        project: (fd.get('project') as string) || null,
        gate: (fd.get('gate') as string) || null,
        status: 'verified',
        next_inspection_date: (fd.get('next_inspection_date') as string) || null,
        created_by: user?.id,
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push('/vehicles')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Plate Number *</label>
            <input name="plate_number" required className="glass-input" placeholder="e.g. ABC1234" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Driver Name</label>
            <input name="driver_name" className="glass-input" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">National ID</label>
            <input name="national_id" className="glass-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Year of Manufacture</label>
            <input name="year_of_manufacture" type="number" min="1990" max="2030" className="glass-input" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Company</label>
          <select name="company_id" className="glass-input">
            <option value="">Select company...</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Equipment Type</label>
          <select name="equipment_type_id" className="glass-input">
            <option value="">Select type...</option>
            {equipmentTypes.map(e => <option key={e.id} value={e.id}>{e.name} ({e.category})</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Project</label>
            <input name="project" className="glass-input" placeholder="e.g. OXAGON" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Gate</label>
            <input name="gate" className="glass-input" placeholder="e.g. oxagon gate" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Next Inspection Date</label>
          <input name="next_inspection_date" type="date" className="glass-input" />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Adding...' : 'Add Vehicle/Equipment'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
