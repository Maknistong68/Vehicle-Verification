import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { UserRole } from '@/lib/types'
import Link from 'next/link'
import { CompaniesList } from './companies-list'

export default async function CompaniesPage() {
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

  if (!['owner', 'admin'].includes(role)) redirect('/dashboard')

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, code, project, gate, is_active, created_at')
    .order('name')

  return (
    <>
      <PageHeader
        title="Companies"
        description={`${companies?.length ?? 0} companies registered.`}
        action={
          <Link href="/companies/new" className="btn-primary w-full sm:w-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Company
          </Link>
        }
      />

      <CompaniesList companies={companies || []} />
    </>
  )
}
