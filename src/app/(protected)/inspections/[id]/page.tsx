import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { StatusBadge, getInspectionResultVariant, getInspectionStatusVariant } from '@/components/status-badge'
import { maskName, maskPlateNumber, maskNationalId } from '@/lib/masking'
import { UserRole } from '@/lib/types'
import Link from 'next/link'

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')
  const role = profile.role as UserRole

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inspection } = await supabase
    .from('inspections')
    .select(`*, vehicle_equipment:vehicles_equipment(*, equipment_type:equipment_types(*), company:companies(*)), inspector:user_profiles!inspections_assigned_inspector_id_fkey(full_name, email), verifier:user_profiles!inspections_verified_by_fkey(full_name, email)`)
    .eq('id', id)
    .single() as { data: any }

  if (!inspection) redirect('/inspections')
  const ve = inspection.vehicle_equipment

  return (
    <>
      <PageHeader title="Inspection Detail" action={<Link href="/inspections" className="text-sm text-white/50 hover:text-white transition">{'\u2190'} Back to list</Link>} />
      <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-5 md:p-6 space-y-4">
          <h3 className="text-sm font-medium text-white/40 uppercase">Inspection Info</h3>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-white/40">Type</span><span className="text-sm text-white capitalize">{inspection.inspection_type.replace('_', ' ')}</span></div>
            <div className="flex justify-between"><span className="text-sm text-white/40">Result</span><StatusBadge label={inspection.result} variant={getInspectionResultVariant(inspection.result)} /></div>
            <div className="flex justify-between"><span className="text-sm text-white/40">Status</span><StatusBadge label={inspection.status.replace('_', ' ')} variant={getInspectionStatusVariant(inspection.status)} /></div>
            <div className="flex justify-between"><span className="text-sm text-white/40">Scheduled</span><span className="text-sm text-white">{new Date(inspection.scheduled_date).toLocaleString()}</span></div>
            {inspection.completed_at && <div className="flex justify-between"><span className="text-sm text-white/40">Completed</span><span className="text-sm text-white">{new Date(inspection.completed_at).toLocaleString()}</span></div>}
            <div className="flex justify-between"><span className="text-sm text-white/40">Inspector</span><span className="text-sm text-white">{maskName(inspection.inspector?.full_name, role)}</span></div>
            {inspection.verified_at && <div className="flex justify-between"><span className="text-sm text-white/40">Verified By</span><span className="text-sm text-green-400">{maskName(inspection.verifier?.full_name, role)}</span></div>}
            {inspection.failure_reason && <div><span className="text-sm text-white/40">Failure Reason</span><p className="text-sm text-red-300 mt-1">{inspection.failure_reason}</p></div>}
            {inspection.notes && <div><span className="text-sm text-white/40">Notes</span><p className="text-sm text-white/70 mt-1">{inspection.notes}</p></div>}
          </div>
        </div>
        <div className="glass-card p-5 md:p-6 space-y-4">
          <h3 className="text-sm font-medium text-white/40 uppercase">Vehicle / Equipment</h3>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-white/40">Plate Number</span><span className="text-sm text-white">{maskPlateNumber(ve?.plate_number, role)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-white/40">Driver</span><span className="text-sm text-white">{maskName(ve?.driver_name, role)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-white/40">National ID</span><span className="text-sm text-white">{maskNationalId(ve?.national_id, role)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-white/40">Equipment</span><span className="text-sm text-white">{ve?.equipment_type?.name || '\u2014'}</span></div>
            <div className="flex justify-between"><span className="text-sm text-white/40">Company</span><span className="text-sm text-white">{ve?.company?.name || '\u2014'}</span></div>
            <div className="flex justify-between"><span className="text-sm text-white/40">Year</span><span className="text-sm text-white">{ve?.year_of_manufacture || '\u2014'}</span></div>
            <div className="flex justify-between"><span className="text-sm text-white/40">Project</span><span className="text-sm text-white">{ve?.project || '\u2014'}</span></div>
          </div>
        </div>
      </div>
    </>
  )
}
