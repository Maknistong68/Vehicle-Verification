'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRole } from '@/lib/role-context'
import { SortHeader } from '@/components/sort-header'
import { useSortable } from '@/hooks/use-sortable'
import { StatusBadge, getVehicleStatusVariant, getInspectionResultVariant } from '@/components/status-badge'
import { maskName, maskPlateNumber, maskNationalId, isMinimalDataRole } from '@/lib/masking'
import { Pagination } from '@/components/pagination'
import { FleetFilters, FleetFilterValues } from './fleet-filters'
import { InlineStatusDropdown } from './inline-status-dropdown'
import { BlacklistToggle } from './blacklist-toggle'
import { createClient } from '@/lib/supabase/client'
import { VehicleStatus } from '@/lib/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Vehicle {
  id: string
  plate_number: string
  driver_name: string | null
  national_id: string | null
  company_id: string | null
  year_of_manufacture: number | null
  project: string | null
  gate: string | null
  status: string
  next_inspection_date: string | null
  blacklisted: boolean
  company: { name?: string } | null
  equipment_type: { name?: string; category?: string; classification?: string } | null
}

export interface InspectionRow {
  id: string
  vehicle_equipment_id: string
  inspection_type: string
  result: string
  status: string
  scheduled_date: string
  completed_at: string | null
  verified_at: string | null
  failure_reason: string | null
  notes: string | null
  inspector: { full_name: string } | null
  verifier: { full_name: string } | null
}

function truncateCompanyName(name: string | undefined | null, maxLen = 20): string {
  if (!name) return '\u2014'
  if (name.length <= maxLen) return name
  const breakChars = ['/', '(', ' - ']
  for (const ch of breakChars) {
    const idx = name.indexOf(ch)
    if (idx > 0 && idx <= maxLen) {
      return name.slice(0, idx).trimEnd()
    }
  }
  return name.slice(0, maxLen).trimEnd() + '\u2026'
}

function getExpiryInfo(dateStr: string | null): { label: string; color: 'red' | 'amber' | null } | null {
  if (!dateStr) return null
  const now = new Date()
  const target = new Date(dateStr)
  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)}d overdue`, color: 'red' }
  }
  if (diffDays <= 30) {
    return { label: `${diffDays}d left`, color: 'amber' }
  }
  return null
}

/** Left-border color for problematic statuses */
function getRowBorderClass(status: string): string {
  switch (status) {
    case 'inspection_overdue':
    case 'rejected':
    case 'blacklisted':
      return 'border-l-4 border-l-red-400'
    case 'updated_inspection_required':
      return 'border-l-4 border-l-yellow-400'
    default:
      return 'border-l-4 border-l-transparent'
  }
}

interface Props {
  vehicles: Vehicle[]
  inspections: InspectionRow[]
  companies: { id: string; name: string }[]
  equipmentTypes: { id: string; name: string; category: string }[]
  totalCount: number
  currentPage: number
  pageSize: number
  serverSearch: string
  serverFilters: FleetFilterValues
}

export function FleetList({ vehicles, inspections, companies, equipmentTypes, totalCount, currentPage, pageSize, serverSearch, serverFilters }: Props) {
  const [searchInput, setSearchInput] = useState(serverSearch)
  const [filters, setFilters] = useState<FleetFilterValues>({ ...serverFilters })
  const [localVehicles, setLocalVehicles] = useState(vehicles)
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const { effectiveRole } = useRole()
  const role = effectiveRole
  const minimal = isMinimalDataRole(role)
  const canEdit = role === 'owner' || role === 'admin' || role === 'inspector'
  const canBlacklist = role === 'owner' || role === 'admin'
  const router = useRouter()
  const supabase = createClient()

  // Sync local vehicles when server data changes
  useEffect(() => { setLocalVehicles(vehicles) }, [vehicles])

  // Push search + filters to URL (server-side search)
  const applySearch = useCallback((query: string, f: FleetFilterValues) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (f.vehicleStatus) params.set('status', f.vehicleStatus)
    if (f.company) params.set('company', f.company)
    if (f.equipmentType) params.set('equipmentType', f.equipmentType)
    if (f.category) params.set('category', f.category)
    if (f.inspectionResult) params.set('result', f.inspectionResult)
    router.push(`?${params.toString()}`)
  }, [router])

  // Debounced search on input change
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (debounceTimer) clearTimeout(debounceTimer)
    setDebounceTimer(setTimeout(() => {
      applySearch(value, filters)
    }, 400))
  }

  const handleFilterChange = (newFilters: FleetFilterValues) => {
    setFilters(newFilters)
    applySearch(searchInput, newFilters)
  }

  // Group inspections by vehicle ID
  const inspectionsByVehicle = useMemo(() => {
    const map = new Map<string, InspectionRow[]>()
    for (const insp of inspections) {
      const vid = insp.vehicle_equipment_id
      const arr = map.get(vid) || []
      arr.push(insp)
      map.set(vid, arr)
    }
    return map
  }, [inspections])

  // Get latest inspection result for a vehicle
  const getLatestResult = (vehicleId: string): string | null => {
    const insps = inspectionsByVehicle.get(vehicleId)
    if (!insps || insps.length === 0) return null
    return insps[0].result
  }

  // Client-side post-filter: only inspection result remains client-side
  const filtered = useMemo(() => {
    if (!filters.inspectionResult) return localVehicles
    return localVehicles.filter(v => {
      const latest = getLatestResult(v.id)
      return latest === filters.inspectionResult
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localVehicles, filters.inspectionResult, inspectionsByVehicle])

  const { sorted, sortKey, sortDir, onSort } = useSortable(filtered, 'plate_number')

  // --- Inline action handlers ---

  const handleStatusUpdate = async (vehicleId: string, newStatus: VehicleStatus) => {
    // Optimistic update
    const previous = localVehicles.find(v => v.id === vehicleId)
    if (!previous) return

    setLocalVehicles(prev => prev.map(v =>
      v.id === vehicleId ? { ...v, status: newStatus, blacklisted: newStatus === 'blacklisted' } : v
    ))
    setUpdatingIds(prev => new Set(prev).add(vehicleId))

    const { error } = await supabase
      .from('vehicles_equipment')
      .update({
        status: newStatus,
        ...(newStatus === 'blacklisted' ? { blacklisted: true } : {}),
        ...(previous.status === 'blacklisted' && newStatus !== 'blacklisted' ? { blacklisted: false } : {}),
      })
      .eq('id', vehicleId)

    setUpdatingIds(prev => {
      const next = new Set(prev)
      next.delete(vehicleId)
      return next
    })

    if (error) {
      // Revert on error
      setLocalVehicles(prev => prev.map(v =>
        v.id === vehicleId ? previous : v
      ))
      alert('Failed to update status. Please try again.')
    } else {
      router.refresh()
    }
  }

  const handleBlacklistToggle = async (vehicleId: string, blacklist: boolean) => {
    const previous = localVehicles.find(v => v.id === vehicleId)
    if (!previous) return

    const newStatus = blacklist ? 'blacklisted' : 'updated_inspection_required'

    // Optimistic update
    setLocalVehicles(prev => prev.map(v =>
      v.id === vehicleId ? { ...v, blacklisted: blacklist, status: newStatus } : v
    ))
    setUpdatingIds(prev => new Set(prev).add(vehicleId))

    const { error } = await supabase
      .from('vehicles_equipment')
      .update({ blacklisted: blacklist, status: newStatus })
      .eq('id', vehicleId)

    setUpdatingIds(prev => {
      const next = new Set(prev)
      next.delete(vehicleId)
      return next
    })

    if (error) {
      setLocalVehicles(prev => prev.map(v =>
        v.id === vehicleId ? previous : v
      ))
      alert('Failed to update blacklist status. Please try again.')
    } else {
      router.refresh()
    }
  }

  const colCount = 6 + (minimal ? 0 : 1) + (canEdit ? 1 : 0) + (canBlacklist ? 0 : 0)

  return (
    <>
      {/* Server-side search bar */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (debounceTimer) clearTimeout(debounceTimer)
              applySearch(searchInput, filters)
            }
          }}
          placeholder="Search by plate, driver, company, type, project, status..."
          className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 outline-none transition-all placeholder:text-gray-300"
        />
        {searchInput && (
          <button
            onClick={() => { setSearchInput(''); applySearch('', filters) }}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <FleetFilters
        filters={filters}
        onChange={handleFilterChange}
        companies={companies}
        equipmentTypes={equipmentTypes}
      />

      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <SortHeader label="Plate / ID" sortKey="plate_number" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />
                {!minimal && <SortHeader label="Driver" sortKey="driver_name" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />}
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Equipment</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Company</th>
                <SortHeader label="Status" sortKey="status" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />
                <SortHeader label="Next Inspection" sortKey="next_inspection_date" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Latest Result</th>
                {canEdit && <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(v => {
                const latestResult = getLatestResult(v.id)
                const isUpdating = updatingIds.has(v.id)
                return (
                  <tr
                    key={v.id}
                    className={`hover:bg-gray-50 ${getRowBorderClass(v.status)} ${isUpdating ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    <td className="p-4">
                      <p className="text-sm text-gray-900 font-medium">{maskPlateNumber(v.plate_number, role)}</p>
                      {!minimal && v.national_id && (
                        <p className="text-xs text-gray-400">ID: {maskNationalId(v.national_id, role)}</p>
                      )}
                    </td>
                    {!minimal && (
                      <td className="p-4 text-sm text-gray-600">{maskName(v.driver_name, role)}</td>
                    )}
                    <td className="p-4">
                      <p className="text-sm text-gray-600">{v.equipment_type?.name || '\u2014'}</p>
                      <p className="text-xs text-gray-400">{v.equipment_type?.category === 'heavy_equipment' ? 'Heavy Equipment' : 'Vehicle'}</p>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{truncateCompanyName(v.company?.name)}</td>
                    <td className="p-4">
                      {canEdit ? (
                        <InlineStatusDropdown
                          vehicleId={v.id}
                          currentStatus={v.status}
                          disabled={isUpdating}
                          onUpdate={handleStatusUpdate}
                        />
                      ) : (
                        <StatusBadge label={v.status.replace(/_/g, ' ')} variant={getVehicleStatusVariant(v.status)} />
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-500">
                        {v.next_inspection_date ? new Date(v.next_inspection_date).toLocaleDateString() : '\u2014'}
                      </span>
                      {(() => {
                        const expiry = getExpiryInfo(v.next_inspection_date)
                        if (!expiry) return null
                        return (
                          <span className={`ml-1.5 text-xs font-medium ${expiry.color === 'red' ? 'text-red-600' : 'text-amber-600'}`}>
                            {expiry.label}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="p-4">
                      {latestResult ? (
                        <StatusBadge label={latestResult} variant={getInspectionResultVariant(latestResult)} />
                      ) : (
                        <span className="text-sm text-gray-300">{'\u2014'}</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {canBlacklist && (
                            <BlacklistToggle
                              vehicleId={v.id}
                              isBlacklisted={v.blacklisted}
                              disabled={isUpdating}
                              onToggle={handleBlacklistToggle}
                            />
                          )}
                          <Link
                            href={`/vehicles/${v.id}/edit`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                            title="Edit vehicle"
                          >
                            {/* Pencil icon */}
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={colCount + 2} className="p-12 text-center">
                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <p className="text-gray-400 text-sm">{searchInput || Object.values(filters).some(Boolean) ? 'No vehicles match your search or filters' : 'No vehicles or equipment found'}</p>
                    {!searchInput && !Object.values(filters).some(Boolean) && <p className="text-gray-300 text-xs mt-1">Add your first vehicle to get started</p>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {sorted.map(v => {
          const latestResult = getLatestResult(v.id)
          const isHeavy = v.equipment_type?.category === 'heavy_equipment'
          const isUpdating = updatingIds.has(v.id)
          return (
            <div
              key={v.id}
              className={`glass-card overflow-hidden ${getRowBorderClass(v.status)} ${isUpdating ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <div className="p-3.5">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isHeavy ? 'bg-yellow-50' : 'bg-blue-50'}`}>
                    {isHeavy ? (
                      <svg className="w-4.5 h-4.5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    ) : (
                      <svg className="w-4.5 h-4.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{maskPlateNumber(v.plate_number, role)}</p>
                        <p className="text-xs text-gray-500 truncate">{v.equipment_type?.name || '\u2014'}</p>
                      </div>
                      {latestResult && <StatusBadge label={latestResult} variant={getInspectionResultVariant(latestResult)} />}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                      <span className="truncate mr-2">{truncateCompanyName(v.company?.name)}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-gray-500">
                          {v.next_inspection_date ? new Date(v.next_inspection_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '\u2014'}
                        </span>
                        {(() => {
                          const expiry = getExpiryInfo(v.next_inspection_date)
                          if (!expiry) return null
                          return (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${expiry.color === 'red' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                              {expiry.label}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile action bar */}
                {canEdit && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <InlineStatusDropdown
                      vehicleId={v.id}
                      currentStatus={v.status}
                      disabled={isUpdating}
                      onUpdate={handleStatusUpdate}
                    />
                    <div className="flex items-center gap-2">
                      {canBlacklist && (
                        <BlacklistToggle
                          vehicleId={v.id}
                          isBlacklisted={v.blacklisted}
                          disabled={isUpdating}
                          onToggle={handleBlacklistToggle}
                        />
                      )}
                      <Link
                        href={`/vehicles/${v.id}/edit`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                        title="Edit vehicle"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <p className="text-gray-400 text-sm">{searchInput || Object.values(filters).some(Boolean) ? 'No vehicles match your search or filters' : 'No vehicles or equipment found'}</p>
            {!searchInput && !Object.values(filters).some(Boolean) && <p className="text-gray-300 text-xs mt-1">Add your first vehicle to get started</p>}
          </div>
        )}
      </div>

      <Pagination currentPage={currentPage} totalCount={totalCount} pageSize={pageSize} />
    </>
  )
}
