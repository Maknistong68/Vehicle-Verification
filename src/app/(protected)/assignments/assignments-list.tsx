'use client'

import { useState, useMemo } from 'react'
import { useRole } from '@/lib/role-context'
import { SearchBar } from '@/components/search-bar'
import { SortHeader } from '@/components/sort-header'
import { useSortable } from '@/hooks/use-sortable'
import { StatusBadge, getAssignmentStatusVariant } from '@/components/status-badge'
import { maskName } from '@/lib/masking'
import { createClient } from '@/lib/supabase/client'
import { Pagination } from '@/components/pagination'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface AssignmentRow {
  id: string
  scheduled_date: string
  status: string
  notes: string | null
  company: { name?: string } | null
  inspector: { full_name?: string } | null
  assigner: { full_name?: string } | null
}

function formatCompactDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

interface Props {
  assignments: AssignmentRow[]
  totalCount: number
  currentPage: number
  pageSize: number
}

export function AssignmentsList({ assignments, totalCount, currentPage, pageSize }: Props) {
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const { effectiveRole } = useRole()
  const role = effectiveRole
  const router = useRouter()
  const canManage = role === 'owner' || role === 'admin'
  const canUpdateStatus = canManage || role === 'inspector'

  const filtered = useMemo(() => {
    if (!search.trim()) return assignments
    const q = search.toLowerCase()
    return assignments.filter(a => {
      const company = (a.company?.name || '').toLowerCase()
      const inspector = maskName(a.inspector?.full_name, role).toLowerCase()
      const status = a.status.toLowerCase()
      const date = new Date(a.scheduled_date).toLocaleString().toLowerCase()
      return company.includes(q) || inspector.includes(q) || status.includes(q) || date.includes(q)
    })
  }, [assignments, search, role])

  const { sorted, sortKey, sortDir, onSort } = useSortable(filtered, 'scheduled_date', 'desc')

  const handleStatusUpdate = async (assignmentId: string, newStatus: string) => {
    const confirmMsg = newStatus === 'delayed'
      ? 'Mark this assignment as delayed?'
      : 'Mark this assignment as done?'
    if (!confirm(confirmMsg)) return
    setUpdatingId(assignmentId)
    const supabase = createClient()
    const { error } = await supabase.from('assignments').update({ status: newStatus }).eq('id', assignmentId)
    if (error) {
      alert('Failed to update assignment. Please try again.')
    }
    setUpdatingId(null)
    router.refresh()
  }

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by company, inspector, status, date..." />

      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Inspector</th>
                <SortHeader label="Date" sortKey="scheduled_date" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />
                <SortHeader label="Status" sortKey="status" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <Link href={`/assignments/${a.id}`} className="text-sm font-medium text-gray-900 hover:text-emerald-600">
                      {a.company?.name || 'Unknown'}
                    </Link>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{maskName(a.inspector?.full_name, role)}</td>
                  <td className="p-4 text-sm text-gray-900">{new Date(a.scheduled_date).toLocaleString()}</td>
                  <td className="p-4"><StatusBadge label={a.status} variant={getAssignmentStatusVariant(a.status)} /></td>
                  <td className="p-4 text-sm text-gray-500 max-w-[200px] truncate">{a.notes || '\u2014'}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Link href={`/assignments/${a.id}`} className="text-sm text-emerald-600 hover:text-emerald-500 font-medium">View</Link>
                      {canManage && a.status !== 'done' && (
                        <Link href={`/assignments/${a.id}/edit`} className="text-sm text-emerald-600 hover:text-emerald-500 font-medium">Edit</Link>
                      )}
                      {canUpdateStatus && a.status !== 'done' && a.status !== 'delayed' && (
                        <button
                          onClick={() => handleStatusUpdate(a.id, 'delayed')}
                          disabled={updatingId === a.id}
                          className="text-sm text-yellow-600 hover:text-yellow-500 font-medium disabled:opacity-50"
                        >
                          {updatingId === a.id ? '...' : 'Delay'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400 text-sm">{search ? 'No assignments match your search' : 'No assignments found'}</p>
                    {!search && <p className="text-gray-300 text-xs mt-1">Create a new assignment to get started</p>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {sorted.map((a) => (
          <Link key={a.id} href={`/assignments/${a.id}`} className="block glass-card-interactive p-3.5">
            <div className="flex items-start justify-between mb-1.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{a.company?.name || 'Unknown'}</p>
                <p className="text-xs text-gray-500">{maskName(a.inspector?.full_name, role)}</p>
              </div>
              <StatusBadge label={a.status} variant={getAssignmentStatusVariant(a.status)} />
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-100">
              <span className="text-gray-400">{formatCompactDateTime(a.scheduled_date)}</span>
            </div>
            {a.notes && (
              <p className="text-xs text-gray-400 mt-1.5 truncate">{a.notes}</p>
            )}
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-400 text-sm">{search ? 'No assignments match your search' : 'No assignments found'}</p>
            {!search && <p className="text-gray-300 text-xs mt-1">Create a new assignment to get started</p>}
          </div>
        )}
      </div>

      <Pagination currentPage={currentPage} totalCount={totalCount} pageSize={pageSize} />
    </>
  )
}
