'use client'

import { useState, useMemo } from 'react'
import { SearchBar } from '@/components/search-bar'
import { SortHeader } from '@/components/sort-header'
import { useSortable } from '@/hooks/use-sortable'
import { Pagination } from '@/components/pagination'

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
  CREATE: 'text-green-700 bg-green-50',
  UPDATE: 'text-blue-700 bg-blue-50',
  DELETE: 'text-red-700 bg-red-50',
  LOGIN: 'text-purple-700 bg-purple-50',
  ASSIGN: 'text-yellow-700 bg-yellow-50',
  SUBMIT: 'text-cyan-700 bg-cyan-50',
  INSERT: 'text-green-700 bg-green-50',
}

interface Props {
  logs: AuditLogRow[]
  totalCount: number
  currentPage: number
  pageSize: number
}

export function AuditLogsList({ logs, totalCount, currentPage, pageSize }: Props) {
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

  const { sorted, sortKey, sortDir, onSort } = useSortable(filtered, 'created_at', 'desc')

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by user email, action, table, role..." />

      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <SortHeader label="Timestamp" sortKey="created_at" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />
                <SortHeader label="User" sortKey="user_email" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />
                <SortHeader label="Role" sortKey="user_role" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />
                <SortHeader label="Action" sortKey="action" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />
                <SortHeader label="Table" sortKey="table_name" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Record ID</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Changes</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 text-sm text-gray-600">{log.user_email || '\u2014'}</td>
                  <td className="p-4 text-xs text-gray-500 capitalize">{log.user_role || '\u2014'}</td>
                  <td className="p-4">
                    <span className={"inline-flex px-2 py-0.5 text-xs font-medium rounded " + (actionColors[log.action] || 'text-gray-600 bg-gray-50')}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-500">{log.table_name || '\u2014'}</td>
                  <td className="p-4 text-xs text-gray-400 font-mono">
                    {log.record_id ? '...' + log.record_id.slice(-8) : '\u2014'}
                  </td>
                  <td className="p-4 max-w-[300px]">
                    {log.old_values || log.new_values ? (
                      <details className="cursor-pointer">
                        <summary className="text-xs text-emerald-600 hover:text-emerald-500">View changes</summary>
                        <div className="mt-2 space-y-2 text-xs">
                          {log.old_values && (
                            <div>
                              <span className="text-red-600 font-medium">Old:</span>
                              <pre className="text-gray-500 mt-1 overflow-auto max-h-24 text-[10px]">{JSON.stringify(sanitizeAuditData(log.old_values), null, 2)}</pre>
                            </div>
                          )}
                          {log.new_values && (
                            <div>
                              <span className="text-green-600 font-medium">New:</span>
                              <pre className="text-gray-500 mt-1 overflow-auto max-h-24 text-[10px]">{JSON.stringify(sanitizeAuditData(log.new_values), null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </details>
                    ) : (
                      <span className="text-xs text-gray-300">{'\u2014'}</span>
                    )}
                  </td>
                  <td className="p-4 text-xs text-gray-400 font-mono">{log.ip_address || '\u2014'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-gray-400">
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
        {sorted.map((log) => (
          <div key={log.id} className="glass-card-interactive p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
                <p className="text-sm text-gray-600 mt-0.5">{log.user_email || '\u2014'}</p>
              </div>
              <span className={"inline-flex px-2 py-0.5 text-xs font-medium rounded " + (actionColors[log.action] || 'text-gray-600 bg-gray-50')}>
                {log.action}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="capitalize">{log.user_role || '\u2014'}</span>
              <span>&middot;</span>
              <span>{log.table_name || '\u2014'}</span>
            </div>
            {(log.old_values || log.new_values) && (
              <details className="mt-2 cursor-pointer">
                <summary className="text-xs text-emerald-600">View changes</summary>
                <div className="mt-2 space-y-2 text-xs">
                  {log.old_values && (
                    <div>
                      <span className="text-red-600 font-medium">Old:</span>
                      <pre className="text-gray-500 mt-1 overflow-auto max-h-24 text-[10px]">{JSON.stringify(sanitizeAuditData(log.old_values), null, 2)}</pre>
                    </div>
                  )}
                  {log.new_values && (
                    <div>
                      <span className="text-green-600 font-medium">New:</span>
                      <pre className="text-gray-500 mt-1 overflow-auto max-h-24 text-[10px]">{JSON.stringify(sanitizeAuditData(log.new_values), null, 2)}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12 text-sm">
            {search ? 'No audit logs match your search' : 'No audit logs found'}
          </p>
        )}
      </div>

      <Pagination currentPage={currentPage} totalCount={totalCount} pageSize={pageSize} />
    </>
  )
}
