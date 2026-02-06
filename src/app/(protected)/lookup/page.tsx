import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserRole } from '@/lib/types'
import { LookupClient } from './lookup-client'

export default async function LookupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  const role = profile.role as UserRole

  // Only owner, contractor, and verifier can access this page
  if (role !== 'owner' && role !== 'contractor' && role !== 'verifier') redirect('/dashboard')

  // Fetch vehicles — RLS already handles scoping:
  // - Verifier: sees ALL vehicles
  // - Contractor: sees only their company's vehicles (via RLS)
  const { data: vehicles } = await supabase
    .from('vehicles_equipment')
    .select(`
      id, plate_number, driver_name, national_id, status, blacklisted,
      company:companies(name),
      equipment_type:equipment_types(name, category)
    `)
    .order('plate_number')

  const hasNoCompany = role === 'contractor' && !profile.company_id

  return (
    <LookupClient
      vehicles={(vehicles || []) as any}
      role={role}
      hasNoCompany={hasNoCompany}
    />
  )
}
