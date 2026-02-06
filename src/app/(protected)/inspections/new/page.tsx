import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { CreateInspectionForm } from './form'

export default async function NewInspectionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!profile || !['owner', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: vehicles } = await supabase.from('vehicles_equipment').select('id, plate_number, driver_name').order('plate_number')
  const { data: inspectors } = await supabase.from('user_profiles').select('id, full_name').eq('role', 'inspector').eq('is_active', true).order('full_name')

  return (
    <>
      <PageHeader title="Create Inspection" description="Schedule a new vehicle or equipment inspection." />
      <CreateInspectionForm vehicles={vehicles || []} inspectors={inspectors || []} />
    </>
  )
}
