'use client'

import { useState, useMemo } from 'react'
import { SearchBar } from '@/components/search-bar'

interface AuditLogRow {
  id: number
  user_email: string | null
  user_role: string | null
  action: string
  table_name: string | null
  record_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

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

const actionColors: Record<string, string> = {
  CREATE: 'text-green-300 bg-green-500/15',
  UPDATE: 'text-blue-300 bg-blue-500/15',
  DELETE: 'text-red-300 bg-red-500/15',
  LOGIN: 'text-purple-300 bg-purple-500/15',
  ASSIGN: 'text-yellow-300 bg-yellow-500/15',
  SUBMIT: 'text-cyan-300 bg-cyan-500/15',
  INSERT: 'text-green-300 bg-green-500/15',
}

export function AuditLogsList({ logs }: { logs: AuditLogRow[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return logs
    const q = search.toLowerCase()
    return logs.filter(log => {
      const email = (log.user_email || '').toLowerCase()
      const action = log.action.toLowerCase()
      const table = (log.table_name || '').toLowerCase()
      const role = (log.user_role || '').toLowerCase()
      return email.includes(q) || action.includes(q) || table.includes(q) || role.includes(q)
    })
  }, [logs, search])

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by user email, action, table, role..." />

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
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.03]">
                  <td className="p-4 text-xs text-white/50 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 text-sm text-white/70">{log.user_email || '\u2014'}</td>
                  <td className="p-4 text-xs text-white/50 capitalize">{log.user_role || '\u2014'}</td>
                  <td className="p-4">
                    <span className={"inline-flex px-2 py-0.5 text-xs font-medium rounded backdrop-blur-sm " + (actionColors[log.action] || 'text-white/50 bg-white/10')}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-white/50">{log.table_name || '\u2014'}</td>
                  <td className="p-4 text-xs text-white/40 font-mono">
                    {log.record_id ? '...' + log.record_id.slice(-8) : '\u2014'}
                  </td>
                  <td className="p-4 max-w-[300px]">
                    {log.old_values || log.new_values ? (
                      <details className="cursor-pointer">
                        <summary className="text-xs text-indigo-400 hover:text-indigo-300">View changes</summary>
                        <div className="mt-2 space-y-2 text-xs">
                          {log.old_values && (
                            <div>
                              <span className="text-red-300 font-medium">Old:</span>
                              <pre className="text-white/40 mt-1 overflow-auto max-h-24 text-[10px]">{JSON.stringify(sanitizeAuditData(log.old_values), null, 2)}</pre>
                            </div>
                          )}
                          {log.new_values && (
                            <div>
                              <span className="text-green-300 font-medium">New:</span>
                              <pre className="text-white/40 mt-1 overflow-auto max-h-24 text-[10px]">{JSON.stringify(sanitizeAuditData(log.new_values), null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </details>
                    ) : (
                      <span className="text-xs text-white/20">{'\u2014'}</span>
                    )}
                  </td>
                  <td className="p-4 text-xs text-white/40 font-mono">{log.ip_address || '\u2014'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-white/40">
                    {search ? 'No audit logs match your search' : 'No audit logs found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((log) => (
          <div key={log.id} className="glass-card-interactive p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-white/50">{new Date(log.created_at).toLocaleString()}</p>
                <p className="text-sm text-white/70 mt-0.5">{log.user_email || '\u2014'}</p>
              </div>
              <span className={"inline-flex px-2 py-0.5 text-xs font-medium rounded backdrop-blur-sm " + (actionColors[log.action] || 'text-white/50 bg-white/10')}>
                {log.action}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span className="capitalize">{log.user_role || '\u2014'}</span>
              <span>&middot;</span>
              <span>{log.table_name || '\u2014'}</span>
            </div>
            {(log.old_values || log.new_values) && (
              <details className="mt-2 cursor-pointer">
                <summary className="text-xs text-indigo-400">View changes</summary>
                <div className="mt-2 space-y-2 text-xs">
                  {log.old_values && (
                    <div>
                      <span className="text-red-300 font-medium">Old:</span>
                      <pre className="text-white/40 mt-1 overflow-auto max-h-24 text-[10px]">{JSON.stringify(sanitizeAuditData(log.old_values), null, 2)}</pre>
                    </div>
                  )}
                  {log.new_values && (
                    <div>
                      <span className="text-green-300 font-medium">New:</span>
                      <pre className="text-white/40 mt-1 overflow-auto max-h-24 text-[10px]">{JSON.stringify(sanitizeAuditData(log.new_values), null, 2)}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-white/40 py-12 text-sm">
            {search ? 'No audit logs match your search' : 'No audit logs found'}
          </p>
        )}
      </div>
    </>
  )
}
