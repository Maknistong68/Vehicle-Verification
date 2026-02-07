'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cleanPlateNumber, validatePlateNumber } from '@/lib/plate-validation'
import { sanitizeText } from '@/lib/sanitize'

interface Props {
  vehicles: { id: string; plate_number: string; driver_name: string | null; company_id?: string | null }[]
  inspectors: { id: string; full_name: string }[]
  equipmentTypes: { id: string; name: string; category: string }[]
  failureReasons: { id: string; name: string }[]
  currentUserId: string
  currentUserRole: string
  currentUserName: string
  assignmentId?: string | null
  companyName?: string | null
}

export function CreateInspectionForm({ vehicles: initialVehicles, inspectors, equipmentTypes, failureReasons, currentUserId, currentUserRole, currentUserName, assignmentId, companyName }: Props) {
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
  const [plateError, setPlateError] = useState<string | null>(null)

  // Instant result state
  const [recordNow, setRecordNow] = useState(false)
  const [result, setResult] = useState<'pass' | 'fail' | ''>('')
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(new Set())
  const [otherChecked, setOtherChecked] = useState(false)
  const [otherText, setOtherText] = useState('')
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

  const toggleReason = (reason: string) => {
    setSelectedReasons(prev => {
      const next = new Set(prev)
      if (next.has(reason)) next.delete(reason)
      else next.add(reason)
      return next
    })
  }

  const buildFailureReason = (): string => {
    const parts = [...selectedReasons]
    if (otherChecked && otherText.trim()) {
      parts.push('Other: ' + otherText.trim())
    }
    return parts.join(', ')
  }

  const handleAddVehicle = async () => {
    const cleaned = cleanPlateNumber(newPlate)
    const plateErr = validatePlateNumber(cleaned)
    if (plateErr) {
      setPlateError(plateErr)
      return
    }
    setPlateError(null)
    setAddingVehicle(true)
    setError(null)

    const insertData: Record<string, unknown> = {
      plate_number: cleaned,
      status: 'updated_inspection_required',
    }
    if (newDriver.trim()) insertData.driver_name = sanitizeText(newDriver).slice(0, 100)
    if (newEquipmentTypeId) insertData.equipment_type_id = newEquipmentTypeId

    const { data, error: insertError } = await supabase
      .from('vehicles_equipment')
      .insert(insertData)
      .select('id, plate_number, driver_name')
      .single()

    if (insertError) {
      setError('Failed to add vehicle. Please try again.')
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

    // Validate instant result fields
    if (recordNow) {
      if (!result) {
        setError('Please select an inspection result')
        return
      }
      if (result === 'fail') {
        const hasReasons = selectedReasons.size > 0 || (otherChecked && otherText.trim())
        if (!hasReasons) {
          setError('Please select at least one failure reason')
          return
        }
      }
    }

    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const { data: { user } } = await supabase.auth.getUser()

    const failureReason = recordNow && result === 'fail'
      ? sanitizeText(buildFailureReason()).slice(0, 500)
      : null

    const insertData: Record<string, unknown> = {
      vehicle_equipment_id: selectedVehicleId,
      assigned_inspector_id: isInspector ? currentUserId : fd.get('inspector_id') as string,
      assigned_by: user?.id,
      scheduled_date: fd.get('scheduled_date') as string,
      inspection_type: fd.get('inspection_type') as string,
      notes: sanitizeText(fd.get('notes') as string).slice(0, 1000) || null,
      result: recordNow ? result : 'pending',
      status: recordNow ? 'completed' : 'scheduled',
    }

    if (recordNow) {
      insertData.completed_at = new Date().toISOString()
      insertData.failure_reason = failureReason
    }

    // Link to assignment if provided
    if (assignmentId) {
      insertData.assignment_id = assignmentId
    }

    const { data: inspectionData, error: insertError } = await supabase
      .from('inspections')
      .insert(insertData)
      .select('id')
      .single()

    if (insertError) { setError('Failed to create inspection. Please try again.'); setLoading(false); return }

    // If coming from an assignment, go back to the assignment detail page
    if (assignmentId) {
      router.push(`/assignments/${assignmentId}`)
    } else {
      router.push('/inspections')
    }
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      {/* Assignment context banner */}
      {assignmentId && companyName && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-700">Creating inspection for assignment at <strong>{companyName}</strong></p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        {/* Vehicle searchable combobox */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Vehicle / Equipment</label>
          {!showAddVehicle ? (
            <div ref={vehicleRef} className="relative">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  placeholder="Search plate number or driver..."
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
                <div className="absolute z-20 w-full mt-1 glass-card-strong border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
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
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                          selectedVehicleId === v.id ? 'bg-gray-100 text-gray-900' : 'text-gray-600'
                        }`}
                      >
                        <span className="font-medium text-gray-900">{v.plate_number}</span>
                        <span className="text-gray-400"> {'\u2014'} {v.driver_name || 'No driver'}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400">
                      {vehicleSearch ? 'No vehicles match your search' : 'Type to search...'}
                    </div>
                  )}

                  {/* Add new vehicle toggle */}
                  <div className="border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => { setShowAddVehicle(true); setShowVehicleDropdown(false); setNewPlate(cleanPlateNumber(vehicleSearch)) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-emerald-600 hover:bg-gray-50 transition-colors font-medium"
                    >
                      + Vehicle not listed? Add new
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 glass-card border border-emerald-200 rounded-lg space-y-3">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Add New Vehicle</p>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Plate Number *</label>
                <input
                  type="text"
                  value={newPlate}
                  onChange={(e) => {
                    setNewPlate(cleanPlateNumber(e.target.value))
                    setPlateError(null)
                  }}
                  placeholder="e.g. ABC1234"
                  className="glass-input text-sm"
                />
                {plateError && <p className="text-xs text-red-500 mt-1">{plateError}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Driver Name (optional)</label>
                <input
                  type="text"
                  value={newDriver}
                  onChange={(e) => setNewDriver(e.target.value)}
                  placeholder="Driver full name"
                  className="glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Equipment Type (optional)</label>
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
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Inspector</label>
            <div className="glass-input text-sm text-gray-500 flex items-center">
              <svg className="w-4 h-4 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {currentUserName} (You)
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Assign Inspector</label>
            <select name="inspector_id" required className="glass-input">
              <option value="">Select inspector...</option>
              {inspectors.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Inspection Type</label>
          <select name="inspection_type" required className="glass-input">
            <option value="routine">Routine</option>
            <option value="follow_up">Follow Up</option>
            <option value="re_inspection">Re-Inspection</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Scheduled Date</label>
          <input type="datetime-local" name="scheduled_date" required className="glass-input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Notes (optional)</label>
          <textarea name="notes" rows={3} className="glass-input" placeholder="Additional notes..." />
        </div>

        {/* Record Result Now toggle */}
        <div className="border-t border-gray-200 pt-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={recordNow}
                onChange={() => {
                  setRecordNow(!recordNow)
                  if (recordNow) {
                    setResult('')
                    setSelectedReasons(new Set())
                    setOtherChecked(false)
                    setOtherText('')
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 rounded-full peer-checked:bg-emerald-500 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Record result now</span>
              <p className="text-xs text-gray-400">Skip scheduling — record Pass/Fail immediately</p>
            </div>
          </label>
        </div>

        {/* Instant result section */}
        {recordNow && (
          <div className="space-y-5 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            {/* Result selection */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-3">Inspection Result *</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-green-500/50 has-[:checked]:border-green-500 has-[:checked]:bg-green-500/10 flex-1 min-h-[44px] transition-colors">
                  <input
                    type="radio"
                    name="instant_result"
                    value="pass"
                    className="text-green-500"
                    checked={result === 'pass'}
                    onChange={() => setResult('pass')}
                  />
                  <div><p className="text-sm font-medium text-gray-900">PASS</p><p className="text-xs text-gray-400">Vehicle meets all requirements</p></div>
                </label>
                <label className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-red-500/50 has-[:checked]:border-red-500 has-[:checked]:bg-red-500/10 flex-1 min-h-[44px] transition-colors">
                  <input
                    type="radio"
                    name="instant_result"
                    value="fail"
                    className="text-red-500"
                    checked={result === 'fail'}
                    onChange={() => setResult('fail')}
                  />
                  <div><p className="text-sm font-medium text-gray-900">FAIL</p><p className="text-xs text-gray-400">Vehicle does not meet requirements</p></div>
                </label>
              </div>
            </div>

            {/* Structured failure reasons */}
            {result === 'fail' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Failure Reasons *</label>
                <p className="text-xs text-gray-400 mb-3">Select all that apply</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {failureReasons.map(fr => (
                    <label
                      key={fr.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                        selectedReasons.has(fr.name)
                          ? 'border-red-300 bg-red-50 text-gray-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedReasons.has(fr.name)}
                        onChange={() => toggleReason(fr.name)}
                        className="rounded text-red-500 shrink-0"
                      />
                      {fr.name}
                    </label>
                  ))}
                  {/* Other option */}
                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                      otherChecked
                        ? 'border-red-300 bg-red-50 text-gray-900'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={otherChecked}
                      onChange={() => setOtherChecked(!otherChecked)}
                      className="rounded text-red-500 shrink-0"
                    />
                    Other
                  </label>
                </div>
                {otherChecked && (
                  <input
                    type="text"
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    placeholder="Describe the other reason..."
                    className="glass-input mt-2 text-sm"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : recordNow ? 'Create & Submit Result' : 'Create Inspection'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  )
}
