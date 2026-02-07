'use client'

import { useState, useMemo } from 'react'
import { useRole } from '@/lib/role-context'
import { SearchBar } from '@/components/search-bar'
import { SortHeader } from '@/components/sort-header'
import { useSortable } from '@/hooks/use-sortable'
import { StatusBadge } from '@/components/status-badge'
import { maskName } from '@/lib/masking'
import { Pagination } from '@/components/pagination'
import Link from 'next/link'

interface UserRow {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

const roleBadgeVariants: Record<string, 'purple' | 'info' | 'success' | 'warning' | 'neutral'> = {
  owner: 'purple',
  admin: 'info',
  inspector: 'success',
  contractor: 'warning',
  verifier: 'neutral',
}

interface Props {
  users: UserRow[]
  totalCount: number
  currentPage: number
  pageSize: number
}

export function UsersList({ users, totalCount, currentPage, pageSize }: Props) {
  const [search, setSearch] = useState('')
  const { effectiveRole } = useRole()
  const role = effectiveRole

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(u => {
      const name = maskName(u.full_name, role).toLowerCase()
      const email = u.email.toLowerCase()
      const userRole = u.role.toLowerCase()
      const status = u.is_active ? 'active' : 'inactive'
      return name.includes(q) || email.includes(q) || userRole.includes(q) || status.includes(q)
    })
  }, [users, search, role])

  const { sorted, sortKey, sortDir, onSort } = useSortable(filtered, 'full_name')

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, role, status..." />

      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <SortHeader label="Name" sortKey="full_name" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />
                <SortHeader label="Email" sortKey="email" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />
                <SortHeader label="Role" sortKey="role" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />
                <SortHeader label="Status" sortKey="is_active" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Created</th>
                {role === 'owner' && (
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-medium text-white">
                        {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="text-sm text-gray-900 font-medium">{maskName(u.full_name, role)}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{u.email}</td>
                  <td className="p-4">
                    <StatusBadge
                      label={u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                      variant={roleBadgeVariants[u.role] || 'neutral'}
                    />
                  </td>
                  <td className="p-4">
                    {u.is_active ? (
                      <span className="text-xs text-green-600">Active</span>
                    ) : (
                      <span className="text-xs text-red-500">Inactive</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  {role === 'owner' && (
                    <td className="p-4">
                      <Link
                        href={"/users/" + u.id + "/edit"}
                        className="text-sm text-emerald-600 hover:text-emerald-500 font-medium"
                      >
                        Edit Role
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    {search ? 'No users match your search' : 'No users found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sorted.map((u) => (
          <div key={u.id} className="glass-card-interactive p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-medium text-white shrink-0">
                {u.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{maskName(u.full_name, role)}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <StatusBadge
                    label={u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    variant={roleBadgeVariants[u.role] || 'neutral'}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${u.is_active ? 'text-green-600' : 'text-red-500'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {role === 'owner' && (
                    <Link
                      href={"/users/" + u.id + "/edit"}
                      className="text-xs text-emerald-600 font-medium"
                    >
                      Edit Role
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12 text-sm">
            {search ? 'No users match your search' : 'No users found'}
          </p>
        )}
      </div>

      <Pagination currentPage={currentPage} totalCount={totalCount} pageSize={pageSize} />
    </>
  )
}
