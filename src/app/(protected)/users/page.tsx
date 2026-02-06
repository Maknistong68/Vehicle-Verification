import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { maskName, maskId } from '@/lib/masking'
import { UserRole } from '@/lib/types'
import Link from 'next/link'

const roleBadgeVariants: Record<string, 'purple' | 'info' | 'success' | 'warning' | 'neutral'> = {
  owner: 'purple',
  admin: 'info',
  inspector: 'success',
  contractor: 'warning',
  verifier: 'neutral',
}

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin'].includes(profile.role)) redirect('/dashboard')
  const role = profile.role as UserRole

  const { data: users } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <>
      <PageHeader
        title="User Management"
        description="Manage system users and their roles."
        action={
          <Link
            href="/users/new"
            className="btn-primary w-full sm:w-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </Link>
        }
      />

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
              {users?.map((u) => (
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
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-white/40">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {users?.map((u) => (
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
        {(!users || users.length === 0) && (
          <p className="text-center text-white/40 py-12 text-sm">No users found</p>
        )}
      </div>
    </>
  )
}
