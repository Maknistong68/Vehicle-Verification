import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { EditVehicleForm } from './form'

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: vehicle } = await supabase
    .from('vehicles_equipment')
    .select('id, plate_number, driver_name, national_id, company_id, equipment_type_id, year_of_manufacture, project, gate, status, next_inspection_date')
    .eq('id', id)
    .single()

  if (!vehicle) redirect('/fleet')

  const [companiesRes, equipmentTypesRes] = await Promise.all([
    supabase.from('companies').select('id, name').eq('is_active', true).order('name'),
    supabase.from('equipment_types').select('id, name, category, classification').eq('is_active', true).order('name'),
  ])

  return (
    <>
      <PageHeader title="Edit Vehicle / Equipment" description={`Editing: ${vehicle.plate_number}`} />
      <EditVehicleForm
        vehicle={vehicle}
        companies={companiesRes.data || []}
        equipmentTypes={equipmentTypesRes.data || []}
      />
    </>
  )
}
