import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { EditAppointmentForm } from './form'

export default async function EditAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: appointment } = await supabase
    .from('appointments')
    .select('id, vehicle_equipment_id, inspector_id, scheduled_date, status, notes')
    .eq('id', id)
    .single()

  if (!appointment || appointment.status === 'completed' || appointment.status === 'cancelled') {
    redirect('/appointments')
  }

  const [vehiclesRes, inspectorsRes] = await Promise.all([
    supabase.from('vehicles_equipment').select('id, plate_number, driver_name').order('plate_number'),
    supabase.from('user_profiles').select('id, full_name').eq('role', 'inspector').eq('is_active', true).order('full_name'),
  ])

  return (
    <>
      <PageHeader title="Edit Appointment" description="Modify the appointment details." />
      <EditAppointmentForm
        appointment={appointment}
        vehicles={vehiclesRes.data || []}
        inspectors={inspectorsRes.data || []}
      />
    </>
  )
}
