import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { maskVehicleRecords } from '@/lib/masking'
import { UserRole } from '@/lib/types'
import { CreateInspectionForm } from './form'

export default async function NewInspectionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile || !['owner', 'admin', 'inspector'].includes(profile.role)) redirect('/dashboard')

  const { data: vehicles } = await supabase.from('vehicles_equipment').select('id, plate_number, driver_name, company_id').order('plate_number')
  const { data: equipmentTypes } = await supabase.from('equipment_types').select('id, name, category').eq('is_active', true).order('name')
  const { data: failureReasons } = await supabase.from('failure_reasons').select('id, name').eq('is_active', true).order('name')
  const { data: companies } = await supabase.from('companies').select('id, name').eq('is_active', true).order('name')

  return (
    <>
      <PageHeader title="Create Inspection" description="Record a vehicle or equipment inspection result." />
      <CreateInspectionForm
        vehicles={maskVehicleRecords(vehicles || [], profile.role as UserRole)}
        equipmentTypes={equipmentTypes || []}
        companies={companies || []}
        failureReasons={failureReasons || []}
        currentUserId={user.id}
        currentUserRole={profile.role}
        currentUserName={profile.full_name}
      />
    </>
  )
}
