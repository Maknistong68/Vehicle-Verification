'use client'

import { useState, useMemo } from 'react'
import { useRole } from '@/lib/role-context'
import { SearchBar } from '@/components/search-bar'
import { StatusBadge } from '@/components/status-badge'
import { maskName } from '@/lib/masking'
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

export function UsersList({ users }: { users: UserRow[] }) {
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

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, role, status..." />

      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Name</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Email</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Role</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Status</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Created</th>
                {role === 'owner' && (
                  <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.03]">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-blue-purple flex items-center justify-center text-xs font-medium text-white">
                        {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="text-sm text-white font-medium">{maskName(u.full_name, role)}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-white/70">{u.email}</td>
                  <td className="p-4">
                    <StatusBadge
                      label={u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                      variant={roleBadgeVariants[u.role] || 'neutral'}
                    />
                  </td>
                  <td className="p-4">
                    {u.is_active ? (
                      <span className="text-xs text-green-400">Active</span>
                    ) : (
                      <span className="text-xs text-red-400">Inactive</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-white/50">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  {role === 'owner' && (
                    <td className="p-4">
                      <Link
                        href={"/users/" + u.id + "/edit"}
                        className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        Edit Role
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-white/40">
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
        {filtered.map((u) => (
          <div key={u.id} className="glass-card-interactive p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full gradient-blue-purple flex items-center justify-center text-sm font-medium text-white shrink-0">
                {u.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{maskName(u.full_name, role)}</p>
                    <p className="text-xs text-white/40 truncate">{u.email}</p>
                  </div>
                  <StatusBadge
                    label={u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    variant={roleBadgeVariants[u.role] || 'neutral'}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${u.is_active ? 'text-green-400' : 'text-red-400'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {role === 'owner' && (
                    <Link
                      href={"/users/" + u.id + "/edit"}
                      className="text-xs text-indigo-400 font-medium"
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
          <p className="text-center text-white/40 py-12 text-sm">
            {search ? 'No users match your search' : 'No users found'}
          </p>
        )}
      </div>
    </>
  )
}
