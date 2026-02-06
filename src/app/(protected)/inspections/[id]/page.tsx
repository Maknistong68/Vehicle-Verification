import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { StatusBadge, getInspectionResultVariant, getInspectionStatusVariant } from '@/components/status-badge'
import { maskName, maskPlateNumber, maskNationalId } from '@/lib/masking'
import { UserRole } from '@/lib/types'
import { ReadOnlyChecklist } from '@/components/inspection-checklist'
import Link from 'next/link'

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')
  const role = profile.role as UserRole

  const { data: inspectionRaw } = await supabase
    .from('inspections')
    .select(`*, vehicle_equipment:vehicles_equipment(*, equipment_type:equipment_types(*), company:companies(*)), inspector:user_profiles!inspections_assigned_inspector_id_fkey(full_name, email), verifier:user_profiles!inspections_verified_by_fkey(full_name, email)`)
    .eq('id', id)
    .single()

  // Cast FK joins from arrays to single objects (Supabase .single() guarantees this)
  interface InspectionDetail {
    id: string; inspection_type: string; result: string; status: string
    scheduled_date: string; completed_at: string | null; failure_reason: string | null; notes: string | null
    verified_at: string | null
    vehicle_equipment: {
      plate_number: string; driver_name: string | null; national_id: string | null
      year_of_manufacture: number | null; project: string | null
      equipment_type: { name: string; category: string } | null
      company: { name: string } | null
    } | null
    inspector: { full_name: string; email: string } | null
    verifier: { full_name: string; email: string } | null
  }
  const inspection = inspectionRaw as unknown as InspectionDetail | null

  if (!inspection) redirect('/inspections')
  const ve = inspection.vehicle_equipment

  // Fetch checklist items for this inspection
  const { data: checklistItems } = await supabase
    .from('inspection_checklist_items')
    .select('id, item_name, item_description, passed, notes')
    .eq('inspection_id', id)
    .order('id')

  return (
    <>
      <PageHeader title="Inspection Detail" action={<Link href="/inspections" className="text-sm text-gray-500 hover:text-gray-900 transition">{'\u2190'} Back to list</Link>} />
      <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-5 md:p-6 space-y-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase">Inspection Info</h3>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-gray-400">Type</span><span className="text-sm text-gray-900 capitalize">{inspection.inspection_type.replace('_', ' ')}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-400">Result</span><StatusBadge label={inspection.result} variant={getInspectionResultVariant(inspection.result)} /></div>
            <div className="flex justify-between"><span className="text-sm text-gray-400">Status</span><StatusBadge label={inspection.status.replace('_', ' ')} variant={getInspectionStatusVariant(inspection.status)} /></div>
            <div className="flex justify-between"><span className="text-sm text-gray-400">Scheduled</span><span className="text-sm text-gray-900">{new Date(inspection.scheduled_date).toLocaleString()}</span></div>
            {inspection.completed_at && <div className="flex justify-between"><span className="text-sm text-gray-400">Completed</span><span className="text-sm text-gray-900">{new Date(inspection.completed_at).toLocaleString()}</span></div>}
            <div className="flex justify-between"><span className="text-sm text-gray-400">Inspector</span><span className="text-sm text-gray-900">{maskName(inspection.inspector?.full_name, role)}</span></div>
            {inspection.verified_at && <div className="flex justify-between"><span className="text-sm text-gray-400">Verified By</span><span className="text-sm text-green-600">{maskName(inspection.verifier?.full_name, role)}</span></div>}
            {inspection.failure_reason && <div><span className="text-sm text-gray-400">Failure Reason</span><p className="text-sm text-red-600 mt-1">{inspection.failure_reason}</p></div>}
            {inspection.notes && <div><span className="text-sm text-gray-400">Notes</span><p className="text-sm text-gray-600 mt-1">{inspection.notes}</p></div>}
          </div>
        </div>
        <div className="glass-card p-5 md:p-6 space-y-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase">Vehicle / Equipment</h3>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-gray-400">Plate Number</span><span className="text-sm text-gray-900">{maskPlateNumber(ve?.plate_number, role)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-400">Driver</span><span className="text-sm text-gray-900">{maskName(ve?.driver_name, role)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-400">National ID</span><span className="text-sm text-gray-900">{maskNationalId(ve?.national_id, role)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-400">Equipment</span><span className="text-sm text-gray-900">{ve?.equipment_type?.name || '\u2014'}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-400">Company</span><span className="text-sm text-gray-900">{ve?.company?.name || '\u2014'}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-400">Year</span><span className="text-sm text-gray-900">{ve?.year_of_manufacture || '\u2014'}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-400">Project</span><span className="text-sm text-gray-900">{ve?.project || '\u2014'}</span></div>
          </div>
        </div>
      </div>

      {/* Checklist results */}
      {checklistItems && checklistItems.length > 0 && (
        <div className="max-w-4xl mt-6 glass-card p-5 md:p-6">
          <ReadOnlyChecklist items={checklistItems as any} />
        </div>
      )}
    </>
  )
}
