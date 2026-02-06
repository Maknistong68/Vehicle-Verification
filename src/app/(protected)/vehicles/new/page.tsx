import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { AddVehicleForm } from './form'

export default async function NewVehiclePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  const { data: equipmentTypes } = await supabase
    .from('equipment_types')
    .select('id, name, category, classification')
    .eq('is_active', true)
    .order('name')

  return (
    <>
      <PageHeader title="Add Vehicle / Equipment" description="Register a new vehicle or piece of equipment." />
      <AddVehicleForm companies={companies || []} equipmentTypes={equipmentTypes || []} />
    </>
  )
}
