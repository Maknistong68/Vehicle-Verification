import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { CreateAssignmentForm } from './form'

export default async function NewAssignmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin'].includes(profile.role)) redirect('/dashboard')

  const [companiesRes, inspectorsRes] = await Promise.all([
    supabase.from('companies').select('id, name').eq('is_active', true).order('name'),
    supabase.from('user_profiles').select('id, full_name').eq('role', 'inspector').eq('is_active', true).order('full_name'),
  ])

  return (
    <>
      <PageHeader title="New Assignment" description="Schedule a new inspection assignment for a company." />
      <CreateAssignmentForm companies={companiesRes.data || []} inspectors={inspectorsRes.data || []} />
    </>
  )
}
