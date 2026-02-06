'use client'

import { useState, useMemo } from 'react'
import { UserRole, VehicleStatus } from '@/lib/types'

interface Vehicle {
  id: string
  plate_number: string
  driver_name: string | null
  national_id: string | null
  status: VehicleStatus
  blacklisted: boolean
  company: { name: string } | null
  equipment_type: { name: string; category: string } | null
}

interface Props {
  vehicles: Vehicle[]
  role: UserRole
  hasNoCompany: boolean
}

const statusConfig: Record<VehicleStatus, { label: string; bg: string; border: string; text: string; icon: 'check' | 'warning' | 'info' | 'x' | 'ban'; description: string }> = {
  verified: {
    label: 'VERIFIED',
    bg: 'bg-green-50',
    border: 'border-green-300',
    text: 'text-green-700',
    icon: 'check',
    description: 'This vehicle has passed inspection and is verified for operation.',
  },
  inspection_overdue: {
    label: 'INSPECTION OVERDUE',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-700',
    icon: 'warning',
    description: 'This vehicle\'s inspection is overdue and must be scheduled immediately.',
  },
  updated_inspection_required: {
    label: 'INSPECTION REQUIRED',
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-700',
    icon: 'info',
    description: 'This vehicle requires an updated inspection before it can be verified.',
  },
  rejected: {
    label: 'REJECTED',
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-700',
    icon: 'x',
    description: 'This vehicle has failed inspection and is not approved for operation.',
  },
  blacklisted: {
    label: 'BLACKLISTED',
    bg: 'bg-red-100',
    border: 'border-red-500',
    text: 'text-red-800',
    icon: 'ban',
    description: 'This vehicle has been blacklisted and is permanently barred from operation.',
  },
}

function StatusIcon({ type, className }: { type: string; className?: string }) {
  const cls = className || 'w-20 h-20'
  switch (type) {
    case 'check':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'warning':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    case 'info':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'x':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'ban':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      )
    default:
      return null
  }
}

export function LookupClient({ vehicles, role, hasNoCompany }: Props) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase().trim()
    return vehicles.filter(v =>
      v.plate_number.toLowerCase().includes(q) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(q)) ||
      (v.company?.name && v.company.name.toLowerCase().includes(q)) ||
      (v.equipment_type?.name && v.equipment_type.name.toLowerCase().includes(q))
    )
  }, [query, vehicles])

  const selectedVehicle = selectedId
    ? vehicles.find(v => v.id === selectedId) || null
    : filtered.length === 1
      ? filtered[0]
      : null

  const handleSelect = (id: string) => {
    setSelectedId(id)
  }

  const handleClear = () => {
    setQuery('')
    setSelectedId(null)
  }

  // Determine the effective status (blacklisted overrides)
  const effectiveStatus: VehicleStatus | null = selectedVehicle
    ? selectedVehicle.blacklisted ? 'blacklisted' : selectedVehicle.status
    : null

  const config = effectiveStatus ? statusConfig[effectiveStatus] : null

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vehicle Lookup</h1>
        <p className="text-sm text-gray-500 mt-1">
          {role === 'contractor'
            ? 'Search vehicles from your company'
            : 'Search all vehicles across all companies'}
        </p>
      </div>

      {/* No company warning for contractors */}
      {hasNoCompany && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <svg className="w-8 h-8 text-amber-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-amber-800 font-medium">No company assigned</p>
          <p className="text-sm text-amber-600 mt-1">Contact your administrator to assign you to a company.</p>
        </div>
      )}

      {/* Search bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedId(null) }}
          placeholder="Search by plate number, driver, company, or equipment type..."
          autoFocus
          className="w-full pl-12 pr-12 py-4 text-lg bg-white border-2 border-gray-200 rounded-2xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-gray-300"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Results list (when multiple matches and none selected) */}
      {query.trim() && !selectedVehicle && filtered.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-500">{filtered.length} results found</p>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {filtered.map(v => {
              const vs = v.blacklisted ? 'blacklisted' : v.status
              const sc = statusConfig[vs]
              return (
                <button
                  key={v.id}
                  onClick={() => handleSelect(v.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className={`w-3 h-3 rounded-full shrink-0 ${sc.bg} border ${sc.border}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{v.plate_number}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {[v.company?.name, v.equipment_type?.name, v.driver_name].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text} border ${sc.border}`}>
                    {sc.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* No results */}
      {query.trim() && filtered.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-400 font-medium">No vehicles found</p>
          <p className="text-sm text-gray-300 mt-1">Try a different search term</p>
        </div>
      )}

      {/* Big Status Sticker */}
      {selectedVehicle && config && effectiveStatus && (
        <div className="animate-fade-in">
          {/* Sticker card */}
          <div className={`${config.bg} border-2 ${config.border} rounded-2xl p-8 text-center mb-4`}>
            <div className={`${config.text} flex justify-center mb-4`}>
              <StatusIcon type={config.icon} />
            </div>
            <h2 className={`text-3xl font-bold ${config.text} mb-2`}>
              {config.label}
            </h2>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              {config.description}
            </p>
          </div>

          {/* Vehicle details sub-card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Plate Number</p>
                <p className="text-lg font-bold text-gray-900">{selectedVehicle.plate_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Company</p>
                <p className="text-sm font-medium text-gray-900">{selectedVehicle.company?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Equipment Type</p>
                <p className="text-sm font-medium text-gray-900">{selectedVehicle.equipment_type?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Driver</p>
                <p className="text-sm font-medium text-gray-900">{selectedVehicle.driver_name || '—'}</p>
              </div>
            </div>

            <button
              onClick={handleClear}
              className="w-full mt-2 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Search again
            </button>
          </div>
        </div>
      )}

      {/* Empty state (no search yet) */}
      {!query.trim() && !hasNoCompany && (
        <div className="text-center py-16">
          <svg className="w-20 h-20 text-gray-100 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-300 text-lg">Start typing to search</p>
          <p className="text-gray-200 text-sm mt-1">{vehicles.length} vehicles available</p>
        </div>
      )}
    </div>
  )
}
