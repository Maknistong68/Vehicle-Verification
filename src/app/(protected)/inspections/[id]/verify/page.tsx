import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { VerifyForm } from './form'
import { StatusBadge, getInspectionResultVariant } from '@/components/status-badge'

export default async function VerifyInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'verifier') redirect('/dashboard')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inspection } = await supabase
    .from('inspections')
    .select(`id, result, status, completed_at, notes, failure_reason, verified_at, vehicle_equipment:vehicles_equipment(plate_number)`)
    .eq('id', id).single() as { data: any }

  if (!inspection || inspection.status !== 'completed' || inspection.verified_at) redirect('/inspections')

  return (
    <>
      <PageHeader title="Verify Inspection Result" description="Review and confirm the inspection outcome." />
      <div className="max-w-2xl space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-medium text-gray-400">Inspection Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-500">Vehicle</p><p className="text-sm text-white">{inspection.vehicle_equipment?.plate_number}</p></div>
            <div><p className="text-xs text-gray-500">Result</p><StatusBadge label={inspection.result} variant={getInspectionResultVariant(inspection.result)} /></div>
            <div><p className="text-xs text-gray-500">Completed</p><p className="text-sm text-white">{inspection.completed_at ? new Date(inspection.completed_at).toLocaleString() : '\u2014'}</p></div>
            {inspection.failure_reason && <div className="col-span-2"><p className="text-xs text-gray-500">Failure Reason</p><p className="text-sm text-red-400">{inspection.failure_reason}</p></div>}
            {inspection.notes && <div className="col-span-2"><p className="text-xs text-gray-500">Notes</p><p className="text-sm text-gray-300">{inspection.notes}</p></div>}
          </div>
        </div>
        <VerifyForm inspectionId={inspection.id} />
      </div>
    </>
  )
}
