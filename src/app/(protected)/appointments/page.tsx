import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { StatusBadge, getAppointmentStatusVariant } from '@/components/status-badge'
import { maskName, maskPlateNumber } from '@/lib/masking'
import { UserRole } from '@/lib/types'
import Link from 'next/link'

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  const role = profile.role as UserRole

  let query = supabase
    .from('appointments')
    .select(`
      id, scheduled_date, status, notes,
      vehicle_equipment:vehicles_equipment(plate_number, driver_name),
      inspector:user_profiles!appointments_inspector_id_fkey(full_name),
      scheduler:user_profiles!appointments_scheduled_by_fkey(full_name)
    `)
    .order('scheduled_date', { ascending: false })

  if (role === 'inspector') {
    query = query.eq('inspector_id', user.id)
  }

  const { data: appointments } = await query

  const canCreate = role === 'owner' || role === 'admin'

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Manage inspection appointments and schedules."
        action={
          canCreate ? (
            <Link
              href="/appointments/new"
              className="btn-primary w-full sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Appointment
            </Link>
          ) : undefined
        }
      />

      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Vehicle/Equipment</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Inspector</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Scheduled By</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Date</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Status</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {appointments?.map((apt) => (
                <tr key={apt.id} className="hover:bg-white/[0.03]">
                  <td className="p-4">
                    <p className="text-sm text-white font-medium">
                      {maskPlateNumber((apt.vehicle_equipment as any)?.plate_number, role)}
                    </p>
                    <p className="text-xs text-white/40">
                      {maskName((apt.vehicle_equipment as any)?.driver_name, role)}
                    </p>
                  </td>
                  <td className="p-4 text-sm text-white/70">
                    {maskName((apt.inspector as any)?.full_name, role)}
                  </td>
                  <td className="p-4 text-sm text-white/50">
                    {maskName((apt.scheduler as any)?.full_name, role)}
                  </td>
                  <td className="p-4 text-sm text-white">
                    {new Date(apt.scheduled_date).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <StatusBadge label={apt.status} variant={getAppointmentStatusVariant(apt.status)} />
                  </td>
                  <td className="p-4 text-sm text-white/50 max-w-[200px] truncate">
                    {apt.notes || '—'}
                  </td>
                </tr>
              ))}
              {(!appointments || appointments.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-white/40">No appointments found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {appointments?.map((apt) => (
          <div key={apt.id} className="glass-card-interactive p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-white">
                  {maskPlateNumber((apt.vehicle_equipment as any)?.plate_number, role)}
                </p>
                <p className="text-xs text-white/50">
                  {maskName((apt.inspector as any)?.full_name, role)}
                </p>
              </div>
              <StatusBadge label={apt.status} variant={getAppointmentStatusVariant(apt.status)} />
            </div>
            <div className="flex items-center justify-between text-xs text-white/40 mt-2">
              <span>{new Date(apt.scheduled_date).toLocaleString()}</span>
            </div>
            {apt.notes && (
              <p className="text-xs text-white/40 mt-2 truncate">{apt.notes}</p>
            )}
          </div>
        ))}
        {(!appointments || appointments.length === 0) && (
          <p className="text-center text-white/40 py-12 text-sm">No appointments found</p>
        )}
      </div>
    </>
  )
}
