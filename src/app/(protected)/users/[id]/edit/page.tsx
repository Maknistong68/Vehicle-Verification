import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { EditRoleForm } from './form'

export default async function EditUserRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') redirect('/dashboard')

  const { data: targetUser } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, role, is_active')
    .eq('id', id)
    .single()

  if (!targetUser) redirect('/users')

  return (
    <>
      <PageHeader title="Edit User Role" description={"Editing role for: " + targetUser.email} />
      <EditRoleForm userId={targetUser.id} currentRole={targetUser.role} userName={targetUser.full_name} isActive={targetUser.is_active} />
    </>
  )
}
