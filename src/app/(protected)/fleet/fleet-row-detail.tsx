'use client'

import { useState } from 'react'
import { useRole } from '@/lib/role-context'
import { StatusBadge, getInspectionResultVariant, getInspectionStatusVariant } from '@/components/status-badge'
import { maskName } from '@/lib/masking'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

interface Props {
  vehicleId: string
  inspections: InspectionRow[]
}

function formatCompactDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function FleetRowDetail({ vehicleId, inspections }: Props) {
  const { effectiveRole } = useRole()
  const role = effectiveRole
  const router = useRouter()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const canCancel = role === 'owner' || role === 'admin'
  const canNewInspection = role === 'owner' || role === 'admin' || role === 'inspector'

  const displayed = showAll ? inspections : inspections.slice(0, 5)
  const hasMore = inspections.length > 5

  const handleCancel = async (inspectionId: string) => {
    if (!confirm('Are you sure you want to cancel this inspection? This action cannot be undone.')) return
    setCancellingId(inspectionId)
    const supabase = createClient()
    const { error } = await supabase.from('inspections').update({ status: 'cancelled' }).eq('id', inspectionId)
    if (error) {
      alert('Failed to cancel inspection: ' + error.message)
    }
    setCancellingId(null)
    router.refresh()
  }

  if (inspections.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-gray-400">No inspections yet</p>
        {canNewInspection && (
          <Link href={`/inspections/new?vehicle_id=${vehicleId}`} className="text-xs text-emerald-600 hover:text-emerald-500 font-medium mt-1 inline-block">
            + New Inspection
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="px-2 py-3">
      {/* Desktop mini-table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-3 py-2 text-[10px] font-medium text-gray-400 uppercase">Type</th>
              <th className="text-left px-3 py-2 text-[10px] font-medium text-gray-400 uppercase">Result</th>
              <th className="text-left px-3 py-2 text-[10px] font-medium text-gray-400 uppercase">Status</th>
              <th className="text-left px-3 py-2 text-[10px] font-medium text-gray-400 uppercase">Scheduled</th>
              <th className="text-left px-3 py-2 text-[10px] font-medium text-gray-400 uppercase">Verified</th>
              <th className="text-left px-3 py-2 text-[10px] font-medium text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {displayed.map(insp => (
              <tr key={insp.id} className="hover:bg-gray-50/50">
                <td className="px-3 py-2 text-gray-600 capitalize">{insp.inspection_type.replace('_', ' ')}</td>
                <td className="px-3 py-2"><StatusBadge label={insp.result} variant={getInspectionResultVariant(insp.result)} /></td>
                <td className="px-3 py-2"><StatusBadge label={insp.status.replace('_', ' ')} variant={getInspectionStatusVariant(insp.status)} /></td>
                <td className="px-3 py-2 text-gray-500">{formatCompactDate(insp.scheduled_date)}</td>
                <td className="px-3 py-2">
                  {insp.verified_at ? (
                    <span className="text-green-600 text-xs">{formatCompactDate(insp.verified_at)}</span>
                  ) : (
                    <span className="text-gray-300">{'\u2014'}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/inspections/${insp.id}`} className="text-xs text-emerald-600 hover:text-emerald-500 font-medium">View</Link>
                    {role === 'inspector' && insp.status !== 'completed' && insp.status !== 'cancelled' && (
                      <Link href={`/inspections/${insp.id}/submit`} className="text-xs text-blue-600 hover:text-blue-500 font-medium">Submit</Link>
                    )}
                    {role === 'verifier' && insp.status === 'completed' && !insp.verified_at && (
                      <Link href={`/inspections/${insp.id}/verify`} className="text-xs text-purple-600 hover:text-purple-500 font-medium">Verify</Link>
                    )}
                    {canCancel && insp.status !== 'completed' && insp.status !== 'cancelled' && (
                      <button
                        onClick={() => handleCancel(insp.id)}
                        disabled={cancellingId === insp.id}
                        className="text-xs text-red-600 hover:text-red-500 font-medium disabled:opacity-50"
                      >
                        {cancellingId === insp.id ? '...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {displayed.map(insp => (
          <div key={insp.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-start justify-between mb-1.5">
              <span className="text-xs text-gray-600 capitalize">{insp.inspection_type.replace('_', ' ')}</span>
              <StatusBadge label={insp.result} variant={getInspectionResultVariant(insp.result)} />
            </div>
            <div className="flex items-center justify-between text-xs mt-1.5 pt-1.5 border-t border-gray-200/50">
              <span className="text-gray-400">{formatCompactDate(insp.scheduled_date)}</span>
              <div className="flex items-center gap-2">
                <Link href={`/inspections/${insp.id}`} className="text-emerald-600 font-medium">View</Link>
                {role === 'inspector' && insp.status !== 'completed' && insp.status !== 'cancelled' && (
                  <Link href={`/inspections/${insp.id}/submit`} className="text-blue-600 font-medium">Submit</Link>
                )}
                {role === 'verifier' && insp.status === 'completed' && !insp.verified_at && (
                  <Link href={`/inspections/${insp.id}/verify`} className="text-purple-600 font-medium">Verify</Link>
                )}
                {canCancel && insp.status !== 'completed' && insp.status !== 'cancelled' && (
                  <button onClick={() => handleCancel(insp.id)} disabled={cancellingId === insp.id} className="text-red-500 font-medium disabled:opacity-50">
                    {cancellingId === insp.id ? '...' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer: show more + new inspection link */}
      <div className="flex items-center justify-between mt-2 px-3">
        {hasMore && !showAll && (
          <button onClick={() => setShowAll(true)} className="text-xs text-gray-500 hover:text-gray-700 font-medium">
            View all {inspections.length} inspections
          </button>
        )}
        {showAll && hasMore && (
          <button onClick={() => setShowAll(false)} className="text-xs text-gray-500 hover:text-gray-700 font-medium">
            Show less
          </button>
        )}
        {!hasMore && <span />}
        {canNewInspection && (
          <Link href={`/inspections/new?vehicle_id=${vehicleId}`} className="text-xs text-emerald-600 hover:text-emerald-500 font-medium">
            + New Inspection
          </Link>
        )}
      </div>
    </div>
  )
}
