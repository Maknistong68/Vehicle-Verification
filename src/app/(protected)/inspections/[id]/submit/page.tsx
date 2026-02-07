import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { SubmitResultForm } from './form'

export default async function SubmitInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'inspector') redirect('/dashboard')

  const { data: inspectionRaw } = await supabase
    .from('inspections')
    .select(`id, status, scheduled_date, notes, vehicle_equipment:vehicles_equipment(plate_number)`)
    .eq('id', id).eq('assigned_inspector_id', user.id).single()
  const inspection = inspectionRaw as unknown as { id: string; status: string; scheduled_date: string; notes: string | null; vehicle_equipment: { plate_number: string } | null } | null

  if (!inspection || inspection.status === 'completed' || inspection.status === 'cancelled') redirect('/inspections')

  const { data: failureReasons } = await supabase.from('failure_reasons').select('id, name').eq('is_active', true).order('name')

  return (
    <>
      <PageHeader title="Submit Inspection Result" description={`Vehicle: ${inspection.vehicle_equipment?.plate_number}`} />
      <SubmitResultForm inspectionId={inspection.id} failureReasons={failureReasons || []} />
    </>
  )
}
