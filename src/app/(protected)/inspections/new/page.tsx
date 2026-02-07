import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { maskVehicleRecords } from '@/lib/masking'
import { UserRole } from '@/lib/types'
import { CreateInspectionForm } from './form'

interface SearchParams {
  assignment_id?: string
  company_id?: string
}

export default async function NewInspectionPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const assignmentId = params.assignment_id || null
  const companyId = params.company_id || null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile || !['owner', 'admin', 'inspector'].includes(profile.role)) redirect('/dashboard')

  // If company_id is provided, only fetch vehicles for that company
  let vehiclesQuery = supabase.from('vehicles_equipment').select('id, plate_number, driver_name, company_id').order('plate_number')
  if (companyId) {
    vehiclesQuery = vehiclesQuery.eq('company_id', companyId)
  }

  const { data: vehicles } = await vehiclesQuery
  const { data: inspectors } = await supabase.from('user_profiles').select('id, full_name').eq('role', 'inspector').eq('is_active', true).order('full_name')
  const { data: equipmentTypes } = await supabase.from('equipment_types').select('id, name, category').eq('is_active', true).order('name')

  // Fetch company name if assignment context
  let companyName: string | null = null
  if (companyId) {
    const { data: company } = await supabase.from('companies').select('name').eq('id', companyId).single()
    companyName = company?.name || null
  }

  return (
    <>
      <PageHeader title="Create Inspection" description="Schedule a new vehicle or equipment inspection." />
      <CreateInspectionForm
        vehicles={maskVehicleRecords(vehicles || [], profile.role as UserRole)}
        inspectors={inspectors || []}
        equipmentTypes={equipmentTypes || []}
        currentUserId={user.id}
        currentUserRole={profile.role}
        currentUserName={profile.full_name}
        assignmentId={assignmentId}
        companyName={companyName}
      />
    </>
  )
}
