import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserRole } from '@/lib/types'
import { maskVehicleRecords } from '@/lib/masking'
import { LookupClient } from './lookup-client'

export default async function LookupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  const role = profile.role as UserRole

  // Check company_id separately (column may not exist yet if migration not run)
  let companyId: string | null = null
  if (role === 'contractor') {
    const { data: companyData } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()
    companyId = companyData?.company_id ?? null
  }

  // Fetch vehicles — RLS handles scoping per role
  const { data: vehicles } = await supabase
    .from('vehicles_equipment')
    .select(`
      id, plate_number, driver_name, national_id, status, blacklisted,
      company:companies(name),
      equipment_type:equipment_types(name, category)
    `)
    .order('plate_number')

  const hasNoCompany = role === 'contractor' && !companyId

  return (
    <LookupClient
      vehicles={maskVehicleRecords(vehicles || [], role) as any}
      role={role}
      hasNoCompany={hasNoCompany}
    />
  )
}
