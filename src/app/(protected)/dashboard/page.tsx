import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { StatusBadge, getInspectionResultVariant, getInspectionStatusVariant } from '@/components/status-badge'
import { maskName, maskPlateNumber } from '@/lib/masking'
import { UserRole } from '@/lib/types'
import Link from 'next/link'

export default async function DashboardPage() {
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

  const [
    { count: totalInspections },
    { count: passCount },
    { count: failCount },
    { count: pendingCount },
    { count: scheduledCount },
    { count: completedCount },
    { count: totalVehicles },
  ] = await Promise.all([
    supabase.from('inspections').select('*', { count: 'exact', head: true }),
    supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('result', 'pass'),
    supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('result', 'fail'),
    supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('result', 'pending'),
    supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
    supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('vehicles_equipment').select('*', { count: 'exact', head: true }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentInspections } = await supabase
    .from('inspections')
    .select(`
      id, result, status, scheduled_date, completed_at,
      vehicle_equipment:vehicles_equipment(plate_number, driver_name),
      inspector:user_profiles!inspections_assigned_inspector_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  let inspectorWorkload: { full_name: string; count: number }[] = []
  if (role === 'owner' || role === 'admin') {
    const { data: inspectors } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('role', 'inspector')
      .eq('is_active', true)

    if (inspectors) {
      const workloadPromises = inspectors.map(async (ins) => {
        const { count } = await supabase
          .from('inspections')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_inspector_id', ins.id)
          .in('status', ['scheduled', 'in_progress'])
        return { full_name: ins.full_name, count: count || 0 }
      })
      inspectorWorkload = await Promise.all(workloadPromises)
    }
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${profile.full_name}. Here\u2019s your inspection overview.`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Inspections" value={totalInspections ?? 0} icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" color="blue" />
        <StatCard label="Passed" value={passCount ?? 0} icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" color="green" subtitle={totalInspections ? `${Math.round(((passCount ?? 0) / totalInspections) * 100)}% pass rate` : undefined} />
        <StatCard label="Failed" value={failCount ?? 0} icon="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" color="red" />
        <StatCard label="Pending / Scheduled" value={(pendingCount ?? 0) + (scheduledCount ?? 0)} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Completed" value={completedCount ?? 0} icon="M5 13l4 4L19 7" color="purple" />
        <StatCard label="Total Vehicles/Equipment" value={totalVehicles ?? 0} icon="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" color="cyan" />
        <StatCard label="Scheduled" value={scheduledCount ?? 0} icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card">
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Recent Inspections</h2>
            <Link href="/inspections" className="text-sm text-indigo-400 hover:text-indigo-300">View all</Link>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Vehicle</th>
                  <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Inspector</th>
                  <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Result</th>
                  <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Status</th>
                  <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {recentInspections?.map((insp: any) => (
                  <tr key={insp.id} className="hover:bg-white/[0.03]">
                    <td className="p-4">
                      <p className="text-sm text-white">{maskPlateNumber(insp.vehicle_equipment?.plate_number, role)}</p>
                      <p className="text-xs text-white/40">{maskName(insp.vehicle_equipment?.driver_name, role)}</p>
                    </td>
                    <td className="p-4 text-sm text-white/70">{maskName(insp.inspector?.full_name, role)}</td>
                    <td className="p-4"><StatusBadge label={insp.result} variant={getInspectionResultVariant(insp.result)} /></td>
                    <td className="p-4"><StatusBadge label={insp.status.replace('_', ' ')} variant={getInspectionStatusVariant(insp.status)} /></td>
                    <td className="p-4 text-sm text-white/50">{new Date(insp.scheduled_date).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(!recentInspections || recentInspections.length === 0) && (
                  <tr><td colSpan={5} className="p-8 text-center text-white/40">No inspections found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden p-3 space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {recentInspections?.map((insp: any) => (
              <div key={insp.id} className="glass-card-interactive p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-white">{maskPlateNumber(insp.vehicle_equipment?.plate_number, role)}</p>
                    <p className="text-xs text-white/40">{maskName(insp.vehicle_equipment?.driver_name, role)}</p>
                  </div>
                  <StatusBadge label={insp.result} variant={getInspectionResultVariant(insp.result)} />
                </div>
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{maskName(insp.inspector?.full_name, role)}</span>
                  <span>{new Date(insp.scheduled_date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {(!recentInspections || recentInspections.length === 0) && (
              <p className="text-center text-white/40 py-8 text-sm">No inspections found</p>
            )}
          </div>
        </div>

        {(role === 'owner' || role === 'admin') && (
          <div className="glass-card">
            <div className="p-5 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Inspector Workload</h2>
              <p className="text-xs text-white/40 mt-1">Active assignments</p>
            </div>
            <div className="p-4 space-y-3">
              {inspectorWorkload.map((insp, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full gradient-blue-purple flex items-center justify-center text-xs font-medium text-white">
                      {insp.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm text-white/70">{maskName(insp.full_name, role)}</span>
                  </div>
                  <span className={`text-sm font-medium ${insp.count > 5 ? 'text-red-400' : insp.count > 2 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {insp.count} active
                  </span>
                </div>
              ))}
              {inspectorWorkload.length === 0 && (
                <p className="text-center text-white/40 py-4 text-sm">No inspectors found</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
