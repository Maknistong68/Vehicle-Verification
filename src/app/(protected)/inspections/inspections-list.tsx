'use client'

import { useState, useMemo } from 'react'
import { useRole } from '@/lib/role-context'
import { SearchBar } from '@/components/search-bar'
import { StatusBadge, getInspectionResultVariant, getInspectionStatusVariant } from '@/components/status-badge'
import { maskName, maskPlateNumber } from '@/lib/masking'
import Link from 'next/link'

interface InspectionRow {
  id: string
  inspection_type: string
  result: string
  status: string
  scheduled_date: string
  completed_at: string | null
  notes: string | null
  failure_reason: string | null
  verified_at: string | null
  vehicle_equipment: { id: string; plate_number: string; driver_name: string | null } | null
  inspector: { full_name: string } | null
  verifier: { full_name: string } | null
}

function formatCompactDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function InspectionsList({ inspections }: { inspections: InspectionRow[] }) {
  const [search, setSearch] = useState('')
  const { effectiveRole } = useRole()
  const role = effectiveRole

  const filtered = useMemo(() => {
    if (!search.trim()) return inspections
    const q = search.toLowerCase()
    return inspections.filter(insp => {
      const plate = maskPlateNumber(insp.vehicle_equipment?.plate_number, role).toLowerCase()
      const inspector = maskName(insp.inspector?.full_name, role).toLowerCase()
      const type = insp.inspection_type.replace('_', ' ').toLowerCase()
      const status = insp.status.replace('_', ' ').toLowerCase()
      const result = insp.result.toLowerCase()
      return plate.includes(q) || inspector.includes(q) || type.includes(q) || status.includes(q) || result.includes(q)
    })
  }, [inspections, search, role])

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by plate, inspector, type, status, result..." />

      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Vehicle/Equipment</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Inspector</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Result</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Verified</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((insp) => (
                <tr key={insp.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <p className="text-sm text-gray-900 font-medium">{maskPlateNumber(insp.vehicle_equipment?.plate_number, role)}</p>
                    <p className="text-xs text-gray-400">{maskName(insp.vehicle_equipment?.driver_name, role)}</p>
                  </td>
                  <td className="p-4 text-sm text-gray-600 capitalize">{insp.inspection_type.replace('_', ' ')}</td>
                  <td className="p-4 text-sm text-gray-600">{maskName(insp.inspector?.full_name, role)}</td>
                  <td className="p-4"><StatusBadge label={insp.result} variant={getInspectionResultVariant(insp.result)} /></td>
                  <td className="p-4"><StatusBadge label={insp.status.replace('_', ' ')} variant={getInspectionStatusVariant(insp.status)} /></td>
                  <td className="p-4 text-sm text-gray-500">{new Date(insp.scheduled_date).toLocaleDateString()}</td>
                  <td className="p-4 text-sm">{insp.verified_at ? <span className="text-green-600">Verified</span> : <span className="text-gray-300">{'\u2014'}</span>}</td>
                  <td className="p-4">
                    {role === 'inspector' && insp.status !== 'completed' && insp.status !== 'cancelled' ? (
                      <Link href={`/inspections/${insp.id}/submit`} className="text-sm text-emerald-600 hover:text-emerald-500 font-medium">Submit Result</Link>
                    ) : role === 'verifier' && insp.status === 'completed' && !insp.verified_at ? (
                      <Link href={`/inspections/${insp.id}/verify`} className="text-sm text-emerald-600 hover:text-emerald-500 font-medium">Verify</Link>
                    ) : (
                      <Link href={`/inspections/${insp.id}`} className="text-sm text-emerald-600 hover:text-emerald-500 font-medium">View</Link>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <p className="text-gray-400 text-sm">{search ? 'No inspections match your search' : 'No inspections found'}</p>
                    {!search && <p className="text-gray-300 text-xs mt-1">Create a new inspection to get started</p>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.map((insp) => (
          <div key={insp.id} className="glass-card-interactive p-3.5">
            <div className="flex items-start justify-between mb-1.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{maskPlateNumber(insp.vehicle_equipment?.plate_number, role)}</p>
                <p className="text-xs text-gray-500 capitalize">{insp.inspection_type.replace('_', ' ')}</p>
              </div>
              <StatusBadge label={insp.result} variant={getInspectionResultVariant(insp.result)} />
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-100">
              <span className="text-gray-400">{formatCompactDate(insp.scheduled_date)}</span>
              {role === 'inspector' && insp.status !== 'completed' && insp.status !== 'cancelled' ? (
                <Link href={`/inspections/${insp.id}/submit`} className="text-emerald-600 font-medium">Submit Result</Link>
              ) : role === 'verifier' && insp.status === 'completed' && !insp.verified_at ? (
                <Link href={`/inspections/${insp.id}/verify`} className="text-emerald-600 font-medium">Verify</Link>
              ) : (
                <Link href={`/inspections/${insp.id}`} className="text-emerald-600 font-medium">View</Link>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-gray-400 text-sm">{search ? 'No inspections match your search' : 'No inspections found'}</p>
            {!search && <p className="text-gray-300 text-xs mt-1">Create a new inspection to get started</p>}
          </div>
        )}
      </div>
    </>
  )
}
