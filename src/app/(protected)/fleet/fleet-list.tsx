'use client'

import { useState, useMemo, Fragment, useCallback } from 'react'
import { useRole } from '@/lib/role-context'
import { StatusBadge, getVehicleStatusVariant, getInspectionResultVariant } from '@/components/status-badge'
import { maskName, maskPlateNumber, maskNationalId, isMinimalDataRole } from '@/lib/masking'
import { Pagination } from '@/components/pagination'
import { FleetFilters, FleetFilterValues, EMPTY_FILTERS } from './fleet-filters'
import { FleetRowDetail, InspectionRow } from './fleet-row-detail'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

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

function formatCompactDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const { effectiveRole } = useRole()
  const role = effectiveRole
  const minimal = isMinimalDataRole(role)
  const canEdit = role === 'owner' || role === 'admin'
  const router = useRouter()
  const searchParams = useSearchParams()

  // Push search + filters to URL (server-side search)
  const applySearch = useCallback((query: string, f: FleetFilterValues) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (f.vehicleStatus) params.set('status', f.vehicleStatus)
    if (f.company) params.set('company', f.company)
    if (f.equipmentType) params.set('equipmentType', f.equipmentType)
    if (f.category) params.set('category', f.category)
    if (f.inspectionResult) params.set('result', f.inspectionResult)
    // Reset to page 1 on new search
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

  // Client-side post-filter for joined fields (company, equipment type, category, result)
  // that can't easily be filtered server-side on joined tables
  const filtered = useMemo(() => {
    return vehicles.filter(v => {
      if (filters.company && v.company?.name !== filters.company) return false
      if (filters.equipmentType && v.equipment_type?.name !== filters.equipmentType) return false
      if (filters.category && v.equipment_type?.category !== filters.category) return false
      if (filters.inspectionResult) {
        const latest = getLatestResult(v.id)
        if (latest !== filters.inspectionResult) return false
      }
      return true
    })
  }, [vehicles, filters, inspectionsByVehicle])

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const colCount = 7 + (minimal ? 0 : 1) + (canEdit ? 1 : 0)

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
                <th className="w-10 p-4"></th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Plate Number</th>
                {!minimal && <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Driver</th>}
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Equipment Type</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Next Inspection</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Latest Result</th>
                {canEdit && <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(v => {
                const isExpanded = expandedIds.has(v.id)
                const latestResult = getLatestResult(v.id)
                return (
                  <Fragment key={v.id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(v.id)}
                    >
                      <td className="p-4 text-center">
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
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
                        <StatusBadge label={v.status.replace(/_/g, ' ')} variant={getVehicleStatusVariant(v.status)} />
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {v.next_inspection_date ? new Date(v.next_inspection_date).toLocaleDateString() : '\u2014'}
                      </td>
                      <td className="p-4">
                        {latestResult ? (
                          <StatusBadge label={latestResult} variant={getInspectionResultVariant(latestResult)} />
                        ) : (
                          <span className="text-sm text-gray-300">{'\u2014'}</span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="p-4" onClick={e => e.stopPropagation()}>
                          <Link href={`/vehicles/${v.id}/edit`} className="text-sm text-emerald-600 hover:text-emerald-500 font-medium">Edit</Link>
                        </td>
                      )}
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={colCount} className="bg-gray-50/50 border-b border-gray-200">
                          <FleetRowDetail
                            vehicleId={v.id}
                            inspections={inspectionsByVehicle.get(v.id) || []}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="p-12 text-center">
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
        {filtered.map(v => {
          const isExpanded = expandedIds.has(v.id)
          const latestResult = getLatestResult(v.id)
          const isHeavy = v.equipment_type?.category === 'heavy_equipment'
          return (
            <div key={v.id} className="glass-card overflow-hidden">
              <div
                className="p-3.5 cursor-pointer active:bg-gray-50"
                onClick={() => toggleExpand(v.id)}
              >
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
                      <div className="flex items-center gap-1.5 shrink-0">
                        {latestResult && <StatusBadge label={latestResult} variant={getInspectionResultVariant(latestResult)} />}
                        <StatusBadge label={v.status.replace(/_/g, ' ')} variant={getVehicleStatusVariant(v.status)} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                      <span className="truncate mr-2">{truncateCompanyName(v.company?.name)}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-gray-500">{formatCompactDate(v.next_inspection_date)}</span>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-gray-100">
                  <FleetRowDetail
                    vehicleId={v.id}
                    inspections={inspectionsByVehicle.get(v.id) || []}
                  />
                </div>
              )}
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
