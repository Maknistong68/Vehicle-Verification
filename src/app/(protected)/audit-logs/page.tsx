import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { AuditLogsList } from './audit-logs-list'

const PAGE_SIZE = 25

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
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

  if (!profile || profile.role !== 'owner') redirect('/dashboard')

  const { count: totalCount } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to)

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Immutable record of all system activities. Visible to Owner only."
      />

      <AuditLogsList
        logs={(logs || []) as any}
        totalCount={totalCount ?? 0}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
      />

      <div className="mt-4 p-4 glass-card border-amber-200">
        <p className="text-xs text-amber-700">
          Audit logs are immutable and cannot be edited or deleted. All user actions are automatically recorded.
        </p>
      </div>
    </>
  )
}
