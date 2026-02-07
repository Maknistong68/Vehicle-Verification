import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { EditCompanyForm } from './form'

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, code, project, gate, is_active')
    .eq('id', id)
    .single()

  if (!company) redirect('/companies')

  return (
    <>
      <PageHeader title="Edit Company" description={`Editing ${company.name}.`} />
      <EditCompanyForm company={company} />
    </>
  )
}
