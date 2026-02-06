import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { UserRole } from '@/lib/types'
import Link from 'next/link'
import { UsersList } from './users-list'

const PAGE_SIZE = 25

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
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

  if (!profile || !['owner', 'admin'].includes(profile.role)) redirect('/dashboard')
  const role = profile.role as UserRole

  const { count: totalCount } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })

  const { data: users } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to)

  return (
    <>
      <PageHeader
        title="User Management"
        description="Manage system users and their roles."
        action={
          <Link
            href="/users/new"
            className="btn-primary w-full sm:w-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </Link>
        }
      />

      <UsersList
        users={(users || []) as any}
        totalCount={totalCount ?? 0}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
      />
    </>
  )
}
