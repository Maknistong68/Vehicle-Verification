import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { UserRole } from '@/lib/types'
import Link from 'next/link'
import { AssignmentsList } from './assignments-list'

const PAGE_SIZE = 25

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams
  const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1)
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

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

  // Count query
  let countQuery = supabase
    .from('assignments')
    .select('*', { count: 'exact', head: true })
  if (role === 'inspector') {
    countQuery = countQuery.eq('inspector_id', user.id)
  }
  const { count: totalCount } = await countQuery

  // Data query with pagination
  let query = supabase
    .from('assignments')
    .select(`
      id, scheduled_date, status, notes,
      company:companies(name),
      inspector:user_profiles!assignments_inspector_id_fkey(full_name),
      assigner:user_profiles!assignments_assigned_by_fkey(full_name)
    `)
    .order('scheduled_date', { ascending: false })
    .range(from, to)

  if (role === 'inspector') {
    query = query.eq('inspector_id', user.id)
  }

  const { data: assignments } = await query

  const canCreate = role === 'owner' || role === 'admin'

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Manage inspection assignments and schedules."
        action={
          canCreate ? (
            <Link
              href="/assignments/new"
              className="btn-primary w-full sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Assignment
            </Link>
          ) : undefined
        }
      />

      <AssignmentsList
        assignments={(assignments || []) as any}
        totalCount={totalCount ?? 0}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
      />
    </>
  )
}
