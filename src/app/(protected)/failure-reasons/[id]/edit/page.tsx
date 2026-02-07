import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { EditFailureReasonForm } from './form'

export default async function EditFailureReasonPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: failureReason } = await supabase
    .from('failure_reasons')
    .select('id, name, is_active')
    .eq('id', id)
    .single()

  if (!failureReason) redirect('/failure-reasons')

  return (
    <>
      <PageHeader title="Edit Failure Reason" description={`Editing ${failureReason.name}.`} />
      <EditFailureReasonForm failureReason={failureReason} />
    </>
  )
}
