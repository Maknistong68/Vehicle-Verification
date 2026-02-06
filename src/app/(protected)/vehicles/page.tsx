import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { StatusBadge, getVehicleStatusVariant } from '@/components/status-badge'
import { maskName, maskPlateNumber, maskNationalId, isMinimalDataRole } from '@/lib/masking'
import { UserRole } from '@/lib/types'
import Link from 'next/link'

export default async function VehiclesPage() {
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
  const minimal = isMinimalDataRole(role)

  const { data: vehicles } = await supabase
    .from('vehicles_equipment')
    .select(`
      id, plate_number, driver_name, national_id, year_of_manufacture, project, gate, status, next_inspection_date, blacklisted,
      company:companies(name),
      equipment_type:equipment_types(name, category, classification)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  const canCreate = role === 'owner' || role === 'admin'

  return (
    <>
      <PageHeader
        title="Vehicles & Equipment"
        description={`${vehicles?.length || 0} records found.`}
        action={
          canCreate ? (
            <Link
              href="/vehicles/new"
              className="btn-primary w-full sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Vehicle/Equipment
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
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Plate Number</th>
                {!minimal && <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Driver</th>}
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Equipment Type</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Company</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Project</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Year</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Status</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Next Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {vehicles?.map((v) => (
                <tr key={v.id} className="hover:bg-white/[0.03]">
                  <td className="p-4">
                    <p className="text-sm text-white font-medium">{maskPlateNumber(v.plate_number, role)}</p>
                    {!minimal && v.national_id && (
                      <p className="text-xs text-white/40">ID: {maskNationalId(v.national_id, role)}</p>
                    )}
                  </td>
                  {!minimal && (
                    <td className="p-4 text-sm text-white/70">{maskName(v.driver_name, role)}</td>
                  )}
                  <td className="p-4">
                    <p className="text-sm text-white/70">{(v.equipment_type as any)?.name || '—'}</p>
                    <p className="text-xs text-white/40">{(v.equipment_type as any)?.category === 'heavy_equipment' ? 'Heavy Equipment' : 'Vehicle'}</p>
                  </td>
                  <td className="p-4 text-sm text-white/70">{(v.company as any)?.name || '—'}</td>
                  <td className="p-4 text-sm text-white/50">{v.project || '—'}</td>
                  <td className="p-4 text-sm text-white/50">{v.year_of_manufacture || '—'}</td>
                  <td className="p-4">
                    <StatusBadge
                      label={v.status.replace(/_/g, ' ')}
                      variant={getVehicleStatusVariant(v.status)}
                    />
                  </td>
                  <td className="p-4 text-sm text-white/50">
                    {v.next_inspection_date ? new Date(v.next_inspection_date).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {(!vehicles || vehicles.length === 0) && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-white/40">No vehicles or equipment found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {vehicles?.map((v) => (
          <div key={v.id} className="glass-card-interactive p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-white">{maskPlateNumber(v.plate_number, role)}</p>
                <p className="text-xs text-white/50">{(v.equipment_type as any)?.name || '—'}</p>
              </div>
              <StatusBadge
                label={v.status.replace(/_/g, ' ')}
                variant={getVehicleStatusVariant(v.status)}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-white/40 mt-2">
              <span>{(v.company as any)?.name || '—'}</span>
              <span>{v.next_inspection_date ? `Next: ${new Date(v.next_inspection_date).toLocaleDateString()}` : 'No inspection date'}</span>
            </div>
          </div>
        ))}
        {(!vehicles || vehicles.length === 0) && (
          <p className="text-center text-white/40 py-12 text-sm">No vehicles or equipment found</p>
        )}
      </div>
    </>
  )
}
