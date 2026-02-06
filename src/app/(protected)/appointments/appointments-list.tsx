'use client'

import { useState, useMemo } from 'react'
import { useRole } from '@/lib/role-context'
import { SearchBar } from '@/components/search-bar'
import { StatusBadge, getAppointmentStatusVariant } from '@/components/status-badge'
import { maskName, maskPlateNumber } from '@/lib/masking'
import Link from 'next/link'

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

export function AppointmentsList({ appointments }: { appointments: AppointmentRow[] }) {
  const [search, setSearch] = useState('')
  const { effectiveRole } = useRole()
  const role = effectiveRole

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

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by plate, inspector, status, date..." />

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
              {filtered.map((apt) => (
                <tr key={apt.id} className="hover:bg-white/[0.03]">
                  <td className="p-4">
                    <p className="text-sm text-white font-medium">{maskPlateNumber(apt.vehicle_equipment?.plate_number, role)}</p>
                    <p className="text-xs text-white/40">{maskName(apt.vehicle_equipment?.driver_name, role)}</p>
                  </td>
                  <td className="p-4 text-sm text-white/70">{maskName(apt.inspector?.full_name, role)}</td>
                  <td className="p-4 text-sm text-white/50">{maskName(apt.scheduler?.full_name, role)}</td>
                  <td className="p-4 text-sm text-white">{new Date(apt.scheduled_date).toLocaleString()}</td>
                  <td className="p-4"><StatusBadge label={apt.status} variant={getAppointmentStatusVariant(apt.status)} /></td>
                  <td className="p-4 text-sm text-white/50 max-w-[200px] truncate">{apt.notes || '\u2014'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <svg className="w-10 h-10 text-white/20 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-white/40 text-sm">{search ? 'No appointments match your search' : 'No appointments found'}</p>
                    {!search && <p className="text-white/25 text-xs mt-1">Schedule a new appointment to get started</p>}
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
                <p className="text-sm font-medium text-white">{maskPlateNumber(apt.vehicle_equipment?.plate_number, role)}</p>
                <p className="text-xs text-white/50">{maskName(apt.inspector?.full_name, role)}</p>
              </div>
              <StatusBadge label={apt.status} variant={getAppointmentStatusVariant(apt.status)} />
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-white/5">
              <span className="text-white/40">{formatCompactDateTime(apt.scheduled_date)}</span>
              <Link href={`/appointments/${apt.id}`} className="text-indigo-400 font-medium">View</Link>
            </div>
            {apt.notes && (
              <p className="text-xs text-white/30 mt-1.5 truncate">{apt.notes}</p>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-white/20 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-white/40 text-sm">{search ? 'No appointments match your search' : 'No appointments found'}</p>
            {!search && <p className="text-white/25 text-xs mt-1">Schedule a new appointment to get started</p>}
          </div>
        )}
      </div>
    </>
  )
}
