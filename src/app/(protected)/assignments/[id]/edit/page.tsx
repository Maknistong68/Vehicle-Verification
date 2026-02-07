import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { EditAssignmentForm } from './form'

export default async function EditAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: assignment } = await supabase
    .from('assignments')
    .select('id, company_id, inspector_id, scheduled_date, status, notes')
    .eq('id', id)
    .single()

  if (!assignment || assignment.status === 'done') {
    redirect('/assignments')
  }

  const [companiesRes, inspectorsRes] = await Promise.all([
    supabase.from('companies').select('id, name').eq('is_active', true).order('name'),
    supabase.from('user_profiles').select('id, full_name').eq('role', 'inspector').eq('is_active', true).order('full_name'),
  ])

  return (
    <>
      <PageHeader title="Edit Assignment" description="Modify the assignment details." />
      <EditAssignmentForm
        assignment={assignment}
        companies={companiesRes.data || []}
        inspectors={inspectorsRes.data || []}
      />
    </>
  )
}
