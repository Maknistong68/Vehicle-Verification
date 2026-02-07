'use client'

import { useState } from 'react'

export interface FleetFilterValues {
  vehicleStatus: string
  company: string
  equipmentType: string
  category: string
  inspectionResult: string
}

const EMPTY_FILTERS: FleetFilterValues = {
  vehicleStatus: '',
  company: '',
  equipmentType: '',
  category: '',
  inspectionResult: '',
}

interface Props {
  filters: FleetFilterValues
  onChange: (filters: FleetFilterValues) => void
  companies: { id: string; name: string }[]
  equipmentTypes: { id: string; name: string; category: string }[]
}

const vehicleStatuses = [
  { value: 'verified', label: 'Verified' },
  { value: 'inspection_overdue', label: 'Inspection Overdue' },
  { value: 'expiring_soon', label: 'Expiring Soon (30d)' },
  { value: 'updated_inspection_required', label: 'Update Required' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'blacklisted', label: 'Blacklisted' },
]

const inspectionResults = [
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'pending', label: 'Pending' },
]

const categories = [
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'heavy_equipment', label: 'Heavy Equipment' },
]

export function FleetFilters({ filters, onChange, companies, equipmentTypes }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeCount = Object.values(filters).filter(Boolean).length

  const update = (key: keyof FleetFilterValues, value: string) => {
    onChange({ ...filters, [key]: value })
  }

  const clearAll = () => onChange({ ...EMPTY_FILTERS })

  const selectClass = "glass-input text-xs !py-1.5 min-w-[140px]"

  const filterDropdowns = (
    <>
      <select value={filters.vehicleStatus} onChange={e => update('vehicleStatus', e.target.value)} className={selectClass}>
        <option value="">All Statuses</option>
        {vehicleStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      <select value={filters.company} onChange={e => update('company', e.target.value)} className={selectClass}>
        <option value="">All Companies</option>
        {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
      </select>

      <select value={filters.equipmentType} onChange={e => update('equipmentType', e.target.value)} className={selectClass}>
        <option value="">All Equipment Types</option>
        {equipmentTypes.map(et => <option key={et.id} value={et.name}>{et.name}</option>)}
      </select>

      <select value={filters.category} onChange={e => update('category', e.target.value)} className={selectClass}>
        <option value="">All Categories</option>
        {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>

      <select value={filters.inspectionResult} onChange={e => update('inspectionResult', e.target.value)} className={selectClass}>
        <option value="">All Results</option>
        {inspectionResults.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>

      {activeCount > 0 && (
        <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap">
          Clear all
        </button>
      )}
    </>
  )

  return (
    <>
      {/* Desktop: horizontal row */}
      <div className="hidden md:flex items-center gap-2 mb-4 flex-wrap">
        {filterDropdowns}
      </div>

      {/* Mobile: toggle button + bottom sheet */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="glass-input text-xs !py-2 w-full text-left flex items-center justify-between"
        >
          <span>Filters{activeCount > 0 ? ` (${activeCount})` : ''}</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>

        {mobileOpen && (
          <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={() => setMobileOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl animate-slide-up safe-bottom shadow-xl">
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-8 h-1 rounded-full bg-gray-300" />
              </div>
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
                  {activeCount > 0 && (
                    <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600">Clear all</button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400">Vehicle Status</label>
                  <select value={filters.vehicleStatus} onChange={e => update('vehicleStatus', e.target.value)} className="w-full glass-input text-sm !py-2">
                    <option value="">All Statuses</option>
                    {vehicleStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400">Company</label>
                  <select value={filters.company} onChange={e => update('company', e.target.value)} className="w-full glass-input text-sm !py-2">
                    <option value="">All Companies</option>
                    {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400">Equipment Type</label>
                  <select value={filters.equipmentType} onChange={e => update('equipmentType', e.target.value)} className="w-full glass-input text-sm !py-2">
                    <option value="">All Equipment Types</option>
                    {equipmentTypes.map(et => <option key={et.id} value={et.name}>{et.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400">Category</label>
                  <select value={filters.category} onChange={e => update('category', e.target.value)} className="w-full glass-input text-sm !py-2">
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400">Inspection Result</label>
                  <select value={filters.inspectionResult} onChange={e => update('inspectionResult', e.target.value)} className="w-full glass-input text-sm !py-2">
                    <option value="">All Results</option>
                    {inspectionResults.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-full btn-primary !py-2.5 mt-2"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export { EMPTY_FILTERS }
