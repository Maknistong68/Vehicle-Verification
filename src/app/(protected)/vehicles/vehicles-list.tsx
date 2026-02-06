'use client'

import { useState, useMemo } from 'react'
import { useRole } from '@/lib/role-context'
import { SearchBar } from '@/components/search-bar'
import { StatusBadge, getVehicleStatusVariant } from '@/components/status-badge'
import { maskName, maskPlateNumber, maskNationalId, isMinimalDataRole } from '@/lib/masking'

interface Vehicle {
  id: string
  plate_number: string
  driver_name: string | null
  national_id: string | null
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
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function VehiclesList({ vehicles }: { vehicles: Vehicle[] }) {
  const [search, setSearch] = useState('')
  const { effectiveRole } = useRole()
  const role = effectiveRole
  const minimal = isMinimalDataRole(role)

  const filtered = useMemo(() => {
    if (!search.trim()) return vehicles
    const q = search.toLowerCase()
    return vehicles.filter(v => {
      const plate = maskPlateNumber(v.plate_number, role).toLowerCase()
      const driver = maskName(v.driver_name, role).toLowerCase()
      const company = (v.company?.name || '').toLowerCase()
      const eqType = (v.equipment_type?.name || '').toLowerCase()
      const project = (v.project || '').toLowerCase()
      const status = v.status.replace(/_/g, ' ').toLowerCase()
      return plate.includes(q) || driver.includes(q) || company.includes(q) || eqType.includes(q) || project.includes(q) || status.includes(q)
    })
  }, [vehicles, search, role])

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Search vehicles by plate, driver, company, type, project, status..." />

      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Plate Number</th>
                {!minimal && <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Driver</th>}
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Equipment Type</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Company</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Project</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Year</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Status</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Next Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-white/[0.03]">
                  <td className="p-4">
                    <p className="text-sm text-white font-medium">{maskPlateNumber(v.plate_number, role)}</p>
                    {!minimal && v.national_id && (
                      <p className="text-xs text-white/40">ID: {maskNationalId(v.national_id, role)}</p>
                    )}
                  </td>
                  {!minimal && (
                    <td className="p-4 text-sm text-white/70">{maskName(v.driver_name, role)}</td>
                  )}
                  <td className="p-4">
                    <p className="text-sm text-white/70">{v.equipment_type?.name || '\u2014'}</p>
                    <p className="text-xs text-white/40">{v.equipment_type?.category === 'heavy_equipment' ? 'Heavy Equipment' : 'Vehicle'}</p>
                  </td>
                  <td className="p-4 text-sm text-white/70">{v.company?.name || '\u2014'}</td>
                  <td className="p-4 text-sm text-white/50">{v.project || '\u2014'}</td>
                  <td className="p-4 text-sm text-white/50">{v.year_of_manufacture || '\u2014'}</td>
                  <td className="p-4">
                    <StatusBadge
                      label={v.status.replace(/_/g, ' ')}
                      variant={getVehicleStatusVariant(v.status)}
                    />
                  </td>
                  <td className="p-4 text-sm text-white/50">
                    {v.next_inspection_date ? new Date(v.next_inspection_date).toLocaleDateString() : '\u2014'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <svg className="w-10 h-10 text-white/20 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <p className="text-white/40 text-sm">{search ? 'No vehicles match your search' : 'No vehicles or equipment found'}</p>
                    {!search && <p className="text-white/25 text-xs mt-1">Add your first vehicle to get started</p>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.map((v) => {
          const eqType = v.equipment_type
          const isHeavy = eqType?.category === 'heavy_equipment'
          return (
            <div key={v.id} className="glass-card-interactive p-3.5">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isHeavy ? 'bg-yellow-500/15' : 'bg-blue-500/15'}`}>
                  {isHeavy ? (
                    <svg className="w-4.5 h-4.5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{maskPlateNumber(v.plate_number, role)}</p>
                      <p className="text-xs text-white/50 truncate">{eqType?.name || '\u2014'}</p>
                    </div>
                    <StatusBadge
                      label={v.status.replace(/_/g, ' ')}
                      variant={getVehicleStatusVariant(v.status)}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/40 mt-2 pt-2 border-t border-white/5">
                    <span className="truncate mr-2">{truncateCompanyName(v.company?.name)}</span>
                    <span className="shrink-0 text-white/50">
                      {v.next_inspection_date ? formatCompactDate(v.next_inspection_date) : 'No date'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-white/20 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <p className="text-white/40 text-sm">{search ? 'No vehicles match your search' : 'No vehicles or equipment found'}</p>
            {!search && <p className="text-white/25 text-xs mt-1">Add your first vehicle to get started</p>}
          </div>
        )}
      </div>
    </>
  )
}
