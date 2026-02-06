import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { UserRole } from '@/lib/types'
import Link from 'next/link'
import { InspectionsList } from './inspections-list'

export default async function InspectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  const role = profile.role as UserRole

  let query = supabase
    .from('inspections')
    .select(`
      id, inspection_type, result, status, scheduled_date, completed_at, notes, failure_reason, verified_at,
      vehicle_equipment:vehicles_equipment(id, plate_number, driver_name),
      inspector:user_profiles!inspections_assigned_inspector_id_fkey(full_name),
      verifier:user_profiles!inspections_verified_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  if (role === 'inspector') {
    query = query.eq('assigned_inspector_id', user.id)
  }

  const { data: inspections } = await query

  const canCreate = role === 'owner' || role === 'admin' || role === 'inspector'

  return (
    <>
      <PageHeader
        title="Inspections"
        description="View and manage vehicle and equipment inspections."
        action={canCreate ? (
          <Link href="/inspections/new" className="btn-primary w-full sm:w-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Inspection
          </Link>
        ) : undefined}
      />

      <InspectionsList inspections={(inspections || []) as any} />
    </>
  )
}
