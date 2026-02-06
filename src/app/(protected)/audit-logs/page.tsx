import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'

const SENSITIVE_FIELDS = ['national_id', 'password', 'api_key', 'secret']

function sanitizeAuditData(data: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!data) return null
  const sanitized = { ...data }
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  }
  return sanitized
}

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

  const { data: logs, error: logsError } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  const actionColors: Record<string, string> = {
    CREATE: 'text-green-300 bg-green-500/15',
    UPDATE: 'text-blue-300 bg-blue-500/15',
    DELETE: 'text-red-300 bg-red-500/15',
    LOGIN: 'text-purple-300 bg-purple-500/15',
    ASSIGN: 'text-yellow-300 bg-yellow-500/15',
    SUBMIT: 'text-cyan-300 bg-cyan-500/15',
    INSERT: 'text-green-300 bg-green-500/15',
  }

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Immutable record of all system activities. Visible to Owner only."
      />

      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Timestamp</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">User</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Role</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Action</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Table</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Record ID</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Changes</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs?.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.03]">
                  <td className="p-4 text-xs text-white/50 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 text-sm text-white/70">
                    {log.user_email || '—'}
                  </td>
                  <td className="p-4 text-xs text-white/50 capitalize">
                    {log.user_role || '—'}
                  </td>
                  <td className="p-4">
                    <span className={"inline-flex px-2 py-0.5 text-xs font-medium rounded backdrop-blur-sm " + (actionColors[log.action] || 'text-white/50 bg-white/10')}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-white/50">
                    {log.table_name || '—'}
                  </td>
                  <td className="p-4 text-xs text-white/40 font-mono">
                    {log.record_id ? '...' + log.record_id.slice(-8) : '—'}
                  </td>
                  <td className="p-4 max-w-[300px]">
                    {log.old_values || log.new_values ? (
                      <details className="cursor-pointer">
                        <summary className="text-xs text-indigo-400 hover:text-indigo-300">View changes</summary>
                        <div className="mt-2 space-y-2 text-xs">
                          {log.old_values && (
                            <div>
                              <span className="text-red-300 font-medium">Old:</span>
                              <pre className="text-white/40 mt-1 overflow-auto max-h-24 text-[10px]">{JSON.stringify(sanitizeAuditData(log.old_values as Record<string, unknown> | null), null, 2)}</pre>
                            </div>
                          )}
                          {log.new_values && (
                            <div>
                              <span className="text-green-300 font-medium">New:</span>
                              <pre className="text-white/40 mt-1 overflow-auto max-h-24 text-[10px]">{JSON.stringify(sanitizeAuditData(log.new_values as Record<string, unknown> | null), null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </details>
                    ) : (
                      <span className="text-xs text-white/20">—</span>
                    )}
                  </td>
                  <td className="p-4 text-xs text-white/40 font-mono">
                    {log.ip_address || '—'}
                  </td>
                </tr>
              ))}
              {(!logs || logs.length === 0) && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-white/40">No audit logs found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {logs?.map((log) => (
          <div key={log.id} className="glass-card-interactive p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-white/50">{new Date(log.created_at).toLocaleString()}</p>
                <p className="text-sm text-white/70 mt-0.5">{log.user_email || '—'}</p>
              </div>
              <span className={"inline-flex px-2 py-0.5 text-xs font-medium rounded backdrop-blur-sm " + (actionColors[log.action] || 'text-white/50 bg-white/10')}>
                {log.action}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span className="capitalize">{log.user_role || '—'}</span>
              <span>·</span>
              <span>{log.table_name || '—'}</span>
            </div>
            {(log.old_values || log.new_values) && (
              <details className="mt-2 cursor-pointer">
                <summary className="text-xs text-indigo-400">View changes</summary>
                <div className="mt-2 space-y-2 text-xs">
                  {log.old_values && (
                    <div>
                      <span className="text-red-300 font-medium">Old:</span>
                      <pre className="text-white/40 mt-1 overflow-auto max-h-24 text-[10px]">{JSON.stringify(sanitizeAuditData(log.old_values as Record<string, unknown> | null), null, 2)}</pre>
                    </div>
                  )}
                  {log.new_values && (
                    <div>
                      <span className="text-green-300 font-medium">New:</span>
                      <pre className="text-white/40 mt-1 overflow-auto max-h-24 text-[10px]">{JSON.stringify(sanitizeAuditData(log.new_values as Record<string, unknown> | null), null, 2)}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        ))}
        {(!logs || logs.length === 0) && (
          <p className="text-center text-white/40 py-12 text-sm">No audit logs found</p>
        )}
      </div>

      <div className="mt-4 p-4 glass-card border-yellow-400/20">
        <p className="text-xs text-yellow-300/80">
          Audit logs are immutable and cannot be edited or deleted. All user actions are automatically recorded.
        </p>
      </div>
    </>
  )
}
