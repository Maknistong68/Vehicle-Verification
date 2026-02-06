'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  vehicles: { id: string; plate_number: string; driver_name: string | null }[]
  inspectors: { id: string; full_name: string }[]
  equipmentTypes: { id: string; name: string; category: string }[]
  currentUserId: string
  currentUserRole: string
  currentUserName: string
}

export function CreateInspectionForm({ vehicles: initialVehicles, inspectors, equipmentTypes, currentUserId, currentUserRole, currentUserName }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Vehicle search combobox state
  const [vehicles, setVehicles] = useState(initialVehicles)
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false)
  const vehicleRef = useRef<HTMLDivElement>(null)

  // Inline vehicle creation
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newPlate, setNewPlate] = useState('')
  const [newDriver, setNewDriver] = useState('')
  const [newEquipmentTypeId, setNewEquipmentTypeId] = useState('')
  const [addingVehicle, setAddingVehicle] = useState(false)

  const isInspector = currentUserRole === 'inspector'

  // Filter vehicles based on search
  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch.trim()) return vehicles.slice(0, 50)
    const q = vehicleSearch.toLowerCase()
    return vehicles.filter(v =>
      v.plate_number.toLowerCase().includes(q) ||
      (v.driver_name || '').toLowerCase().includes(q)
    ).slice(0, 50)
  }, [vehicles, vehicleSearch])

  // Selected vehicle display
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (vehicleRef.current && !vehicleRef.current.contains(e.target as Node)) {
        setShowVehicleDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleAddVehicle = async () => {
    if (!newPlate.trim()) return
    setAddingVehicle(true)
    setError(null)

    const insertData: Record<string, unknown> = {
      plate_number: newPlate.trim().toUpperCase(),
      status: 'updated_inspection_required',
    }
    if (newDriver.trim()) insertData.driver_name = newDriver.trim()
    if (newEquipmentTypeId) insertData.equipment_type_id = newEquipmentTypeId

    const { data, error: insertError } = await supabase
      .from('vehicles_equipment')
      .insert(insertData)
      .select('id, plate_number, driver_name')
      .single()

    if (insertError) {
      setError('Failed to add vehicle: ' + insertError.message)
      setAddingVehicle(false)
      return
    }

    if (data) {
      setVehicles(prev => [...prev, data])
      setSelectedVehicleId(data.id)
      setVehicleSearch(data.plate_number + (data.driver_name ? ' \u2014 ' + data.driver_name : ''))
      setShowAddVehicle(false)
      setShowVehicleDropdown(false)
      setNewPlate('')
      setNewDriver('')
      setNewEquipmentTypeId('')
    }
    setAddingVehicle(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedVehicleId) {
      setError('Please select a vehicle')
      return
    }
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from('inspections').insert({
      vehicle_equipment_id: selectedVehicleId,
      assigned_inspector_id: isInspector ? currentUserId : fd.get('inspector_id') as string,
      assigned_by: user?.id,
      scheduled_date: fd.get('scheduled_date') as string,
      inspection_type: fd.get('inspection_type') as string,
      notes: (fd.get('notes') as string) || null,
      result: 'pending',
      status: 'scheduled',
    })

    if (insertError) { setError(insertError.message); setLoading(false); return }
    router.push('/inspections')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        {/* Vehicle searchable combobox */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Vehicle / Equipment</label>
          <div ref={vehicleRef} className="relative">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={vehicleSearch}
                onChange={(e) => {
                  setVehicleSearch(e.target.value)
                  setSelectedVehicleId('')
                  setShowVehicleDropdown(true)
                }}
                onFocus={() => setShowVehicleDropdown(true)}
                placeholder="Type to search vehicles... (plate number or driver)"
                className="glass-input pl-10 text-sm"
              />
              {selectedVehicle && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            {showVehicleDropdown && (
              <div className="absolute z-20 w-full mt-1 glass-card-strong border border-white/10 rounded-lg max-h-60 overflow-y-auto">
                {filteredVehicles.length > 0 ? (
                  filteredVehicles.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVehicleId(v.id)
                        setVehicleSearch(v.plate_number + (v.driver_name ? ' \u2014 ' + v.driver_name : ''))
                        setShowVehicleDropdown(false)
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/[0.05] transition-colors ${
                        selectedVehicleId === v.id ? 'bg-white/10 text-white' : 'text-white/70'
                      }`}
                    >
                      <span className="font-medium text-white">{v.plate_number}</span>
                      <span className="text-white/40"> {'\u2014'} {v.driver_name || 'No driver'}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-white/40">
                    {vehicleSearch ? 'No vehicles match your search' : 'Type to search...'}
                  </div>
                )}

                {/* Add new vehicle toggle */}
                <div className="border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => { setShowAddVehicle(!showAddVehicle); setShowVehicleDropdown(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-indigo-400 hover:bg-white/[0.05] transition-colors font-medium"
                  >
                    + Vehicle not listed? Add new
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Inline add vehicle form */}
          {showAddVehicle && (
            <div className="mt-3 p-4 glass-card border border-indigo-500/20 rounded-lg space-y-3">
              <p className="text-xs font-medium text-indigo-300 uppercase tracking-wider">Add New Vehicle</p>
              <div>
                <label className="block text-xs text-white/50 mb-1">Plate Number *</label>
                <input
                  type="text"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value)}
                  placeholder="e.g. ABC 1234"
                  className="glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Driver Name (optional)</label>
                <input
                  type="text"
                  value={newDriver}
                  onChange={(e) => setNewDriver(e.target.value)}
                  placeholder="Driver full name"
                  className="glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Equipment Type (optional)</label>
                <select
                  value={newEquipmentTypeId}
                  onChange={(e) => setNewEquipmentTypeId(e.target.value)}
                  className="glass-input text-sm"
                >
                  <option value="">Select type...</option>
                  {equipmentTypes.map(et => (
                    <option key={et.id} value={et.id}>
                      {et.name} ({et.category === 'heavy_equipment' ? 'Heavy Equipment' : 'Vehicle'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddVehicle}
                  disabled={!newPlate.trim() || addingVehicle}
                  className="btn-primary text-sm !py-2"
                >
                  {addingVehicle ? 'Adding...' : 'Add Vehicle'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(false)}
                  className="btn-secondary text-sm !py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Inspector field */}
        {isInspector ? (
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Inspector</label>
            <div className="glass-input text-sm text-white/50 flex items-center">
              <svg className="w-4 h-4 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {currentUserName} (You)
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Assign Inspector</label>
            <select name="inspector_id" required className="glass-input">
              <option value="">Select inspector...</option>
              {inspectors.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Inspection Type</label>
          <select name="inspection_type" required className="glass-input">
            <option value="routine">Routine</option>
            <option value="follow_up">Follow Up</option>
            <option value="re_inspection">Re-Inspection</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Scheduled Date</label>
          <input type="datetime-local" name="scheduled_date" required className="glass-input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Notes (optional)</label>
          <textarea name="notes" rows={3} className="glass-input" placeholder="Additional notes..." />
        </div>
        {error && <div className="p-3 glass-card border-red-400/25"><p className="text-sm text-red-300">{error}</p></div>}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating...' : 'Create Inspection'}</button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  )
}
