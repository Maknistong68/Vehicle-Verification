import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { StatusBadge, getInspectionResultVariant, getInspectionStatusVariant } from '@/components/status-badge'
import { maskName, maskPlateNumber } from '@/lib/masking'
import { UserRole } from '@/lib/types'
import Link from 'next/link'

export default async function InspectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  const role = profile.role as UserRole

  let query = supabase
    .from('inspections')
    .select(`
      id, inspection_type, result, status, scheduled_date, completed_at, notes, failure_reason, verified_at,
      vehicle_equipment:vehicles_equipment(id, plate_number, driver_name),
      inspector:user_profiles!inspections_assigned_inspector_id_fkey(full_name),
      verifier:user_profiles!inspections_verified_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  if (role === 'inspector') {
    query = query.eq('assigned_inspector_id', user.id)
  }

  const { data: inspectionsRaw } = await query

  interface InspectionRow {
    id: string; inspection_type: string; result: string; status: string
    scheduled_date: string; completed_at: string | null; notes: string | null
    failure_reason: string | null; verified_at: string | null
    vehicle_equipment: { id: string; plate_number: string; driver_name: string | null } | null
    inspector: { full_name: string } | null
    verifier: { full_name: string } | null
  }
  const inspections = inspectionsRaw as unknown as InspectionRow[] | null

  const canCreate = role === 'owner' || role === 'admin'

  return (
    <>
      <PageHeader
        title="Inspections"
        description="View and manage vehicle and equipment inspections."
        action={canCreate ? (
          <Link href="/inspections/new" className="btn-primary w-full sm:w-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Inspection
          </Link>
        ) : undefined}
      />

      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Vehicle/Equipment</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Type</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Inspector</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Result</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Status</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Scheduled</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Verified</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {inspections?.map((insp) => (
                <tr key={insp.id} className="hover:bg-white/[0.03]">
                  <td className="p-4">
                    <p className="text-sm text-white font-medium">{maskPlateNumber(insp.vehicle_equipment?.plate_number, role)}</p>
                    <p className="text-xs text-white/40">{maskName(insp.vehicle_equipment?.driver_name, role)}</p>
                  </td>
                  <td className="p-4 text-sm text-white/70 capitalize">{insp.inspection_type.replace('_', ' ')}</td>
                  <td className="p-4 text-sm text-white/70">{maskName(insp.inspector?.full_name, role)}</td>
                  <td className="p-4"><StatusBadge label={insp.result} variant={getInspectionResultVariant(insp.result)} /></td>
                  <td className="p-4"><StatusBadge label={insp.status.replace('_', ' ')} variant={getInspectionStatusVariant(insp.status)} /></td>
                  <td className="p-4 text-sm text-white/50">{new Date(insp.scheduled_date).toLocaleDateString()}</td>
                  <td className="p-4 text-sm">{insp.verified_at ? <span className="text-green-400">Verified</span> : <span className="text-white/20">{'\u2014'}</span>}</td>
                  <td className="p-4">
                    {role === 'inspector' && insp.status !== 'completed' && insp.status !== 'cancelled' ? (
                      <Link href={`/inspections/${insp.id}/submit`} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">Submit Result</Link>
                    ) : role === 'verifier' && insp.status === 'completed' && !insp.verified_at ? (
                      <Link href={`/inspections/${insp.id}/verify`} className="text-sm text-cyan-400 hover:text-cyan-300 font-medium">Verify</Link>
                    ) : (
                      <Link href={`/inspections/${insp.id}`} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">View</Link>
                    )}
                  </td>
                </tr>
              ))}
              {(!inspections || inspections.length === 0) && (
                <tr><td colSpan={8} className="p-12 text-center text-white/40">No inspections found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {inspections?.map((insp) => (
          <div key={insp.id} className="glass-card-interactive p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-white">{maskPlateNumber(insp.vehicle_equipment?.plate_number, role)}</p>
                <p className="text-xs text-white/50 capitalize">{insp.inspection_type.replace('_', ' ')}</p>
              </div>
              <div className="flex gap-1.5">
                <StatusBadge label={insp.result} variant={getInspectionResultVariant(insp.result)} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs mt-2">
              <span className="text-white/40">{new Date(insp.scheduled_date).toLocaleDateString()}</span>
              {role === 'inspector' && insp.status !== 'completed' && insp.status !== 'cancelled' ? (
                <Link href={`/inspections/${insp.id}/submit`} className="text-indigo-400 font-medium">Submit Result</Link>
              ) : role === 'verifier' && insp.status === 'completed' && !insp.verified_at ? (
                <Link href={`/inspections/${insp.id}/verify`} className="text-cyan-400 font-medium">Verify</Link>
              ) : (
                <Link href={`/inspections/${insp.id}`} className="text-indigo-400 font-medium">View</Link>
              )}
            </div>
          </div>
        ))}
        {(!inspections || inspections.length === 0) && (
          <p className="text-center text-white/40 py-12 text-sm">No inspections found</p>
        )}
      </div>
    </>
  )
}
