'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/lib/types'
import { useState } from 'react'
import { useRole } from '@/lib/role-context'

interface SidebarProps {
  userRole: UserRole
  userName: string
  userEmail: string
}

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    filledIcon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    roles: ['owner', 'admin', 'inspector', 'contractor', 'verifier'] as UserRole[],
    mobileOrder: 1,
  },
  {
    label: 'Inspections',
    href: '/inspections',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    filledIcon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    roles: ['owner', 'admin', 'inspector', 'verifier'] as UserRole[],
    mobileOrder: 2,
  },
  {
    label: 'Vehicles',
    href: '/vehicles',
    icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    filledIcon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    roles: ['owner', 'admin', 'contractor'] as UserRole[],
    mobileOrder: 3,
  },
  {
    label: 'Lookup',
    href: '/lookup',
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    filledIcon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    roles: ['owner', 'admin', 'inspector', 'contractor', 'verifier'] as UserRole[],
    mobileOrder: 4,
  },
  {
    label: 'Appointments',
    href: '/appointments',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    filledIcon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    roles: ['owner', 'admin', 'inspector'] as UserRole[],
    mobileOrder: 5,
  },
  {
    label: 'Users',
    href: '/users',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    filledIcon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    roles: ['owner', 'admin'] as UserRole[],
    mobileOrder: 6,
  },
  {
    label: 'Audit Logs',
    href: '/audit-logs',
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    filledIcon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    roles: ['owner'] as UserRole[],
    mobileOrder: 7,
  },
]

const roleBadgeColors: Record<UserRole, string> = {
  owner: 'bg-purple-50 text-purple-700 border-purple-200',
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  inspector: 'bg-green-50 text-green-700 border-green-200',
  contractor: 'bg-orange-50 text-orange-700 border-orange-200',
  verifier: 'bg-cyan-50 text-cyan-700 border-cyan-200',
}

const ALL_ROLES: UserRole[] = ['owner', 'admin', 'inspector', 'contractor', 'verifier']

export function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [moreOpen, setMoreOpen] = useState(false)
  const { actualRole, effectiveRole, viewAsRole, setViewAsRole } = useRole()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const filteredItems = navItems.filter(item => item.roles.includes(effectiveRole))

  // Mobile: first 4 items in bottom tab bar, rest in "More" sheet
  const mobileTabItems = filteredItems.slice(0, 4)
  const moreItems = filteredItems.slice(4)
  const hasMore = moreItems.length > 0

  const displayRole = effectiveRole

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col h-full">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-gray-900 font-bold text-base">VVS Inspect</h1>
              <p className="text-gray-400 text-xs">Management System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border-l-2 border-l-emerald-500 border border-emerald-100 pl-2.5'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-transparent'
                }`}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 2 : 1.5} d={item.icon} />
                </svg>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-medium text-white">
              {userName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-400 truncate">{userEmail}</p>
            </div>
          </div>
          <div>
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${roleBadgeColors[displayRole]}`}>
              {displayRole.charAt(0).toUpperCase() + displayRole.slice(1)}
            </span>
          </div>

          {/* POV Switcher - Owner only */}
          {actualRole === 'owner' && (
            <div className="mt-3">
              <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">View as role</label>
              <select
                value={viewAsRole || 'owner'}
                onChange={(e) => {
                  const val = e.target.value as UserRole
                  setViewAsRole(val === 'owner' ? null : val)
                }}
                className="w-full glass-input text-xs !py-1.5"
              >
                {ALL_ROLES.map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}{r === 'owner' ? ' (Default)' : ''}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleSignOut}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Tab Bar ───────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom">
        <div className="bg-white border-t border-gray-200 flex items-stretch justify-around px-1 py-1">
          {mobileTabItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[52px] rounded-xl transition-all ${
                  isActive
                    ? 'text-emerald-600 bg-emerald-50'
                    : 'text-gray-400'
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 2.5 : 1.5} d={isActive ? item.filledIcon : item.icon} />
                </svg>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
          {hasMore && (
            <button
              onClick={() => setMoreOpen(true)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[52px] rounded-xl transition-all ${
                moreOpen ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
              <span className="text-[10px] font-medium">More</span>
            </button>
          )}
        </div>
      </nav>

      {/* ── Mobile "More" Sheet ─────────────────────────── */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/30 animate-fade-in"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl animate-slide-up safe-bottom shadow-xl">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-8 h-1 rounded-full bg-gray-300" />
            </div>

            <div className="px-4 pb-2 space-y-1">
              {moreItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                )
              })}
            </div>

            <div className="mx-4 my-3 border-t border-gray-200" />

            <div className="px-4 pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-medium text-white">
                  {userName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                  <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                </div>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${roleBadgeColors[displayRole]}`}>
                  {displayRole.charAt(0).toUpperCase() + displayRole.slice(1)}
                </span>
              </div>

              {/* POV Switcher in mobile - Owner only */}
              {actualRole === 'owner' && (
                <div className="mb-3">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">View as role</label>
                  <select
                    value={viewAsRole || 'owner'}
                    onChange={(e) => {
                      const val = e.target.value as UserRole
                      setViewAsRole(val === 'owner' ? null : val)
                    }}
                    className="w-full glass-input text-sm !py-2"
                  >
                    {ALL_ROLES.map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}{r === 'owner' ? ' (Default)' : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => { setMoreOpen(false); handleSignOut() }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors min-h-[44px]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
