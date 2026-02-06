import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { AuditLogsList } from './audit-logs-list'

export default async function AuditLogsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') redirect('/dashboard')

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Immutable record of all system activities. Visible to Owner only."
      />

      <AuditLogsList logs={(logs || []) as any} />

      <div className="mt-4 p-4 glass-card border-yellow-400/20">
        <p className="text-xs text-yellow-300/80">
          Audit logs are immutable and cannot be edited or deleted. All user actions are automatically recorded.
        </p>
      </div>
    </>
  )
}
