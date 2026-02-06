'use client'

import { useState, useMemo } from 'react'
import { useRole } from '@/lib/role-context'
import { SearchBar } from '@/components/search-bar'
import { StatusBadge, getAppointmentStatusVariant } from '@/components/status-badge'
import { maskName, maskPlateNumber } from '@/lib/masking'
import { createClient } from '@/lib/supabase/client'
import { Pagination } from '@/components/pagination'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface AppointmentRow {
  id: string
  scheduled_date: string
  status: string
  notes: string | null
  vehicle_equipment: { plate_number?: string; driver_name?: string } | null
  inspector: { full_name?: string } | null
  scheduler: { full_name?: string } | null
}

function formatCompactDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

interface Props {
  appointments: AppointmentRow[]
  totalCount: number
  currentPage: number
  pageSize: number
}

export function AppointmentsList({ appointments, totalCount, currentPage, pageSize }: Props) {
  const [search, setSearch] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const { effectiveRole } = useRole()
  const role = effectiveRole
  const router = useRouter()
  const canManage = role === 'owner' || role === 'admin'

  const filtered = useMemo(() => {
    if (!search.trim()) return appointments
    const q = search.toLowerCase()
    return appointments.filter(apt => {
      const plate = maskPlateNumber(apt.vehicle_equipment?.plate_number, role).toLowerCase()
      const inspector = maskName(apt.inspector?.full_name, role).toLowerCase()
      const status = apt.status.toLowerCase()
      const date = new Date(apt.scheduled_date).toLocaleString().toLowerCase()
      return plate.includes(q) || inspector.includes(q) || status.includes(q) || date.includes(q)
    })
  }, [appointments, search, role])

  const handleCancel = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return
    setCancellingId(appointmentId)
    const supabase = createClient()
    const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appointmentId)
    if (error) {
      alert('Failed to cancel appointment: ' + error.message)
    }
    setCancellingId(null)
    router.refresh()
  }

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by plate, inspector, status, date..." />

      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Vehicle/Equipment</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Inspector</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Scheduled By</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Notes</th>
                {canManage && <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((apt) => (
                <tr key={apt.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <p className="text-sm text-gray-900 font-medium">{maskPlateNumber(apt.vehicle_equipment?.plate_number, role)}</p>
                    <p className="text-xs text-gray-400">{maskName(apt.vehicle_equipment?.driver_name, role)}</p>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{maskName(apt.inspector?.full_name, role)}</td>
                  <td className="p-4 text-sm text-gray-500">{maskName(apt.scheduler?.full_name, role)}</td>
                  <td className="p-4 text-sm text-gray-900">{new Date(apt.scheduled_date).toLocaleString()}</td>
                  <td className="p-4"><StatusBadge label={apt.status} variant={getAppointmentStatusVariant(apt.status)} /></td>
                  <td className="p-4 text-sm text-gray-500 max-w-[200px] truncate">{apt.notes || '\u2014'}</td>
                  {canManage && (
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                          <>
                            <Link href={`/appointments/${apt.id}/edit`} className="text-sm text-emerald-600 hover:text-emerald-500 font-medium">Edit</Link>
                            <button
                              onClick={() => handleCancel(apt.id)}
                              disabled={cancellingId === apt.id}
                              className="text-sm text-red-600 hover:text-red-500 font-medium disabled:opacity-50"
                            >
                              {cancellingId === apt.id ? '...' : 'Cancel'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="p-12 text-center">
                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400 text-sm">{search ? 'No appointments match your search' : 'No appointments found'}</p>
                    {!search && <p className="text-gray-300 text-xs mt-1">Schedule a new appointment to get started</p>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.map((apt) => (
          <div key={apt.id} className="glass-card-interactive p-3.5">
            <div className="flex items-start justify-between mb-1.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{maskPlateNumber(apt.vehicle_equipment?.plate_number, role)}</p>
                <p className="text-xs text-gray-500">{maskName(apt.inspector?.full_name, role)}</p>
              </div>
              <StatusBadge label={apt.status} variant={getAppointmentStatusVariant(apt.status)} />
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-100">
              <span className="text-gray-400">{formatCompactDateTime(apt.scheduled_date)}</span>
              <div className="flex items-center gap-3">
                {canManage && apt.status !== 'completed' && apt.status !== 'cancelled' && (
                  <>
                    <Link href={`/appointments/${apt.id}/edit`} className="text-emerald-600 font-medium">Edit</Link>
                    <button onClick={() => handleCancel(apt.id)} disabled={cancellingId === apt.id} className="text-red-500 font-medium disabled:opacity-50">
                      {cancellingId === apt.id ? '...' : 'Cancel'}
                    </button>
                  </>
                )}
              </div>
            </div>
            {apt.notes && (
              <p className="text-xs text-gray-400 mt-1.5 truncate">{apt.notes}</p>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-400 text-sm">{search ? 'No appointments match your search' : 'No appointments found'}</p>
            {!search && <p className="text-gray-300 text-xs mt-1">Schedule a new appointment to get started</p>}
          </div>
        )}
      </div>

      <Pagination currentPage={currentPage} totalCount={totalCount} pageSize={pageSize} />
    </>
  )
}
