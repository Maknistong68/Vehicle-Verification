import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { UserRole } from '@/lib/types'
import Link from 'next/link'
import { VehiclesList } from './vehicles-list'

export default async function VehiclesPage() {
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

  const { data: vehicles } = await supabase
    .from('vehicles_equipment')
    .select(`
      id, plate_number, driver_name, national_id, year_of_manufacture, project, gate, status, next_inspection_date, blacklisted,
      company:companies(name),
      equipment_type:equipment_types(name, category, classification)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  const canCreate = role === 'owner' || role === 'admin'

  return (
    <>
      <PageHeader
        title="Vehicles & Equipment"
        description={`${vehicles?.length || 0} records found.`}
        action={
          canCreate ? (
            <Link
              href="/vehicles/new"
              className="btn-primary w-full sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Vehicle/Equipment
            </Link>
          ) : undefined
        }
      />

      <VehiclesList vehicles={(vehicles || []) as any} />
    </>
  )
}
