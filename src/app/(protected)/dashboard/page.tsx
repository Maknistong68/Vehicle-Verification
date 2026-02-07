import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { StatusBadge, getInspectionResultVariant, getInspectionStatusVariant } from '@/components/status-badge'
import { maskName, maskPlateNumber } from '@/lib/masking'
import { UserRole } from '@/lib/types'
import Link from 'next/link'

interface RecentInspection {
  id: string
  result: string
  status: string
  scheduled_date: string
  completed_at: string | null
  vehicle_equipment: { plate_number: string; driver_name: string | null } | null
  inspector: { full_name: string } | null
}

const DATE_FILTERS = [
  { label: 'All', value: 'all' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
] as const

function getStartDate(range: string): string | null {
  const now = new Date()
  switch (range) {
    case '1w': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
      return start.toISOString()
    }
    case '1m': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      return start.toISOString()
    }
    case '3m': {
      const start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
      return start.toISOString()
    }
    case '6m': {
      const start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      return start.toISOString()
    }
    case '1y': {
      const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      return start.toISOString()
    }
    default:
      return null
  }
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: rangeParam } = await searchParams
  const range = rangeParam || 'all'
  const startDate = getStartDate(range)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  const role = profile.role as UserRole

  // Build count queries — apply date filter if active
  const q = (extra?: (q: ReturnType<ReturnType<typeof supabase.from>['select']>) => typeof q) => {
    let query = supabase.from('inspections').select('*', { count: 'exact', head: true })
    if (extra) query = extra(query)
    if (startDate) query = query.gte('scheduled_date', startDate)
    return query
  }

  const results = await Promise.all([
    q(),
    q(b => b.eq('result', 'pass')),
    q(b => b.eq('result', 'fail')),
    q(b => b.eq('result', 'pending')),
    q(b => b.eq('status', 'scheduled')),
    q(b => b.eq('status', 'completed')),
    supabase.from('vehicles_equipment').select('*', { count: 'exact', head: true }),
  ])

  const totalInspections = results[0].count ?? 0
  const passCount = results[1].count ?? 0
  const failCount = results[2].count ?? 0
  const pendingCount = results[3].count ?? 0
  const scheduledCount = results[4].count ?? 0
  const completedCount = results[5].count ?? 0
  const totalVehicles = results[6].count ?? 0

  let recentQuery = supabase
    .from('inspections')
    .select(`
      id, result, status, scheduled_date, completed_at,
      vehicle_equipment:vehicles_equipment(plate_number, driver_name),
      inspector:user_profiles!inspections_assigned_inspector_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  if (startDate) {
    recentQuery = recentQuery.gte('created_at', startDate)
  }

  const { data: recentInspectionsRaw } = await recentQuery
  const recentInspections = recentInspectionsRaw as unknown as RecentInspection[] | null

  let inspectorWorkload: { full_name: string; count: number }[] = []
  if (role === 'owner' || role === 'admin') {
    let workloadQuery = supabase
      .from('inspections')
      .select('assigned_inspector_id, inspector:user_profiles!inspections_assigned_inspector_id_fkey(full_name)')
      .in('status', ['scheduled', 'in_progress'])

    if (startDate) {
      workloadQuery = workloadQuery.gte('scheduled_date', startDate)
    }

    const { data: activeInspections } = await workloadQuery

    if (activeInspections) {
      const workloadMap = new Map<string, { full_name: string; count: number }>()
      for (const insp of activeInspections) {
        const id = insp.assigned_inspector_id
        if (!id) continue
        const inspectorRaw = insp.inspector as unknown
        const inspectorData = (Array.isArray(inspectorRaw) ? inspectorRaw[0] : inspectorRaw) as { full_name: string } | null
        const name = inspectorData?.full_name ?? 'Unknown'
        const existing = workloadMap.get(id)
        if (existing) {
          existing.count++
        } else {
          workloadMap.set(id, { full_name: name, count: 1 })
        }
      }
      inspectorWorkload = Array.from(workloadMap.values()).sort((a, b) => b.count - a.count)
    }
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${profile.full_name}. Here\u2019s your inspection overview.`}
      />

      {/* ── Date Filter Pills ──────────────────────────────── */}
      <div className="inline-flex items-center border border-gray-200 rounded-lg divide-x divide-gray-200 mb-5 -mt-2 overflow-hidden">
        {DATE_FILTERS.map((filter) => {
          const isActive = range === filter.value
          const href = filter.value === 'all' ? '/dashboard' : `/dashboard?range=${filter.value}`
          return (
            <Link
              key={filter.value}
              href={href}
              className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </Link>
          )
        })}
      </div>

      {/* ── Overview Stats ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6">
        <StatCard label="Total Inspections" value={totalInspections} icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" color="blue" />
        <StatCard label="Passed" value={passCount} icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" color="green" subtitle={totalInspections ? `${Math.round((passCount / totalInspections) * 100)}% pass rate` : undefined} emptyMessage="No passes yet" />
        <StatCard label="Failed" value={failCount} icon="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" color="red" emptyMessage="No failures" />
        <StatCard label="Pending" value={pendingCount + scheduledCount} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" color="yellow" emptyMessage="All caught up" />
        <StatCard label="Completed" value={completedCount} icon="M5 13l4 4L19 7" color="purple" />
        <StatCard label="Vehicles/Equipment" value={totalVehicles} icon="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" color="cyan" />
      </div>

      {/* ── Activity Section ───────────────────────────────── */}
      <h2 className="text-base font-semibold text-gray-900 tracking-tight mb-4">Recent Activity</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 glass-card">
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Recent Inspections</h3>
            <Link href="/fleet" className="text-xs text-emerald-600 hover:text-emerald-500 font-medium">View all</Link>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Inspector</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Result</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentInspections?.map((insp) => (
                  <tr key={insp.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <p className="text-sm text-gray-900">{maskPlateNumber(insp.vehicle_equipment?.plate_number, role)}</p>
                      <p className="text-xs text-gray-400">{maskName(insp.vehicle_equipment?.driver_name, role)}</p>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{maskName(insp.inspector?.full_name, role)}</td>
                    <td className="p-4"><StatusBadge label={insp.result} variant={getInspectionResultVariant(insp.result)} /></td>
                    <td className="p-4"><StatusBadge label={insp.status.replace('_', ' ')} variant={getInspectionStatusVariant(insp.status)} /></td>
                    <td className="p-4 text-sm text-gray-500">{new Date(insp.scheduled_date).toLocaleDateString()}</td>
                    <td className="p-4"><Link href={`/inspections/${insp.id}`} className="text-xs text-emerald-600 hover:text-emerald-500 font-medium">View</Link></td>
                  </tr>
                ))}
                {(!recentInspections || recentInspections.length === 0) && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-gray-400 text-sm">No inspections yet</p>
                      <p className="text-gray-300 text-xs mt-1">Create your first inspection to get started</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden p-3 space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {recentInspections?.map((insp: any) => (
              <Link key={insp.id} href={`/inspections/${insp.id}`} className="block glass-card-interactive p-3">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{maskPlateNumber(insp.vehicle_equipment?.plate_number, role)}</p>
                    <p className="text-xs text-gray-400">{maskName(insp.vehicle_equipment?.driver_name, role)}</p>
                  </div>
                  <StatusBadge label={insp.result} variant={getInspectionResultVariant(insp.result)} />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 pt-1.5 border-t border-gray-100">
                  <span>{maskName(insp.inspector?.full_name, role)}</span>
                  <span>{new Date(insp.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              </Link>
            ))}
            {(!recentInspections || recentInspections.length === 0) && (
              <div className="text-center py-10">
                <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-400 text-sm">No inspections yet</p>
                <p className="text-gray-300 text-xs mt-1">Create your first inspection to get started</p>
              </div>
            )}
          </div>
        </div>

        {(role === 'owner' || role === 'admin') && (
          <div className="glass-card">
            <div className="p-4 md:p-5 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Inspector Workload</h3>
              <p className="text-xs text-gray-400 mt-1">Active assignments</p>
            </div>
            <div className="p-3 md:p-4 space-y-2">
              {inspectorWorkload.map((insp, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-medium text-white">
                      {insp.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm text-gray-600">{maskName(insp.full_name, role)}</span>
                  </div>
                  <span className={`text-sm font-medium ${insp.count > 5 ? 'text-red-500' : insp.count > 2 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {insp.count} active
                  </span>
                </div>
              ))}
              {inspectorWorkload.length === 0 && (
                <div className="text-center py-6">
                  <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-gray-400 text-xs">No active assignments</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
