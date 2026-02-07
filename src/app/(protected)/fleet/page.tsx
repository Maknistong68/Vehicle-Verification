import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { UserRole } from '@/lib/types'
import { maskVehicleRecords } from '@/lib/masking'
import Link from 'next/link'
import { FleetList } from './fleet-list'

const PAGE_SIZE = 25

interface SearchParams {
  page?: string
  q?: string
  status?: string
  company?: string
  equipmentType?: string
  category?: string
  result?: string
}

export default async function FleetPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const currentPage = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const searchQuery = params.q || ''
  const filterCompany = params.company || ''
  const filterEquipmentType = params.equipmentType || ''
  const filterCategory = params.category || ''
  const filterResult = params.result || ''

  // Whitelist valid status values to prevent filter injection
  const VALID_STATUSES = ['verified', 'updated_inspection_required', 'inspection_overdue', 'rejected', 'blacklisted']
  // 'expiring_soon' is a virtual filter handled client-side, not a DB status
  const VIRTUAL_STATUSES = ['expiring_soon']
  const rawStatus = params.status || ''
  const isVirtualFilter = VIRTUAL_STATUSES.includes(rawStatus)
  const filterStatus = VALID_STATUSES.includes(rawStatus) ? rawStatus : ''
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

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

  // Sanitize search input: strip PostgREST filter operators to prevent injection
  // Characters that could manipulate the .or() filter: commas (separate filters),
  // dots (field.operator), parentheses (grouping), backslash (escape)
  const sanitizedSearch = searchQuery.replace(/[,.()\\\/*]/g, '').slice(0, 100)

  // Build the base query with server-side search and filters
  const buildQuery = (forCount: boolean) => {
    let q = forCount
      ? supabase.from('vehicles_equipment').select('*', { count: 'exact', head: true })
      : supabase.from('vehicles_equipment').select(`
          id, plate_number, driver_name, national_id, company_id, year_of_manufacture, project, gate, status, next_inspection_date, blacklisted,
          company:companies(name),
          equipment_type:equipment_types(name, category, classification)
        `)

    // Server-side search: use individual .ilike() calls instead of .or() interpolation
    // to avoid PostgREST filter injection
    if (sanitizedSearch) {
      q = q.or(`plate_number.ilike.%${sanitizedSearch}%,driver_name.ilike.%${sanitizedSearch}%,project.ilike.%${sanitizedSearch}%`)
    }

    // Server-side filters
    if (filterStatus) {
      q = q.eq('status', filterStatus)
    }

    return q
  }

  // Count query
  const { count: totalCount } = await buildQuery(true)

  // Data query with pagination
  let dataQuery = buildQuery(false)
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data: vehiclesRaw } = await dataQuery

  // Safety net: compute overdue for vehicles whose next_inspection_date has passed
  // but DB status hasn't been updated yet (between cron runs)
  const now = new Date()
  const vehicles = (vehiclesRaw || []).map((v: any) => {
    if (
      v.status === 'verified' &&
      v.next_inspection_date &&
      new Date(v.next_inspection_date) < now
    ) {
      return { ...v, status: 'inspection_overdue' }
    }
    return v
  })

  // Client-side post-filter for joined fields (company name, equipment_type name/category)
  // These can't be easily filtered with Supabase .or() on joined tables
  let filteredVehicles = vehicles
  if (searchQuery && filteredVehicles.length === 0 && !filterStatus) {
    // If server-side text search returned 0 results, also search by company/equipment (requires fetching all)
    const { data: allVehicles } = await supabase
      .from('vehicles_equipment')
      .select(`
        id, plate_number, driver_name, national_id, company_id, year_of_manufacture, project, gate, status, next_inspection_date, blacklisted,
        company:companies(name),
        equipment_type:equipment_types(name, category, classification)
      `)
      .order('created_at', { ascending: false })

    if (allVehicles) {
      const q = searchQuery.toLowerCase()
      filteredVehicles = allVehicles.filter((v: any) =>
        v.plate_number?.toLowerCase().includes(q) ||
        v.driver_name?.toLowerCase().includes(q) ||
        v.project?.toLowerCase().includes(q) ||
        v.company?.name?.toLowerCase().includes(q) ||
        v.equipment_type?.name?.toLowerCase().includes(q) ||
        v.status?.replace(/_/g, ' ').toLowerCase().includes(q)
      )
    }
  }

  // Fetch inspections for current page's vehicle IDs
  const vehicleIds = filteredVehicles.map((v: any) => v.id)
  let inspections: any[] = []
  if (vehicleIds.length > 0) {
    let inspQuery = supabase
      .from('inspections')
      .select(`
        id, vehicle_equipment_id, inspection_type, result, status, scheduled_date, completed_at, verified_at, failure_reason, notes,
        inspector:user_profiles!inspections_assigned_inspector_id_fkey(full_name),
        verifier:user_profiles!inspections_verified_by_fkey(full_name)
      `)
      .in('vehicle_equipment_id', vehicleIds)
      .order('created_at', { ascending: false })

    if (role === 'inspector') {
      inspQuery = inspQuery.eq('assigned_inspector_id', user.id)
    }

    const { data } = await inspQuery
    inspections = data || []
  }

  // Fetch filter options
  const [companiesRes, equipmentTypesRes] = await Promise.all([
    supabase.from('companies').select('id, name').eq('is_active', true).order('name'),
    supabase.from('equipment_types').select('id, name, category, classification').eq('is_active', true).order('name'),
  ])

  const canNewInspection = role === 'owner' || role === 'admin' || role === 'inspector'

  // Compute display count
  const displayCount = searchQuery && filteredVehicles !== vehicles
    ? filteredVehicles.length
    : (totalCount ?? 0)

  return (
    <>
      <PageHeader
        title="Fleet"
        description={`${displayCount} vehicles & equipment${searchQuery ? ` matching "${searchQuery}"` : ''}.`}
        action={
          canNewInspection ? (
            <Link href="/inspections/new" className="btn-primary w-full sm:w-auto">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              New Inspection
            </Link>
          ) : undefined
        }
      />

      <FleetList
        vehicles={maskVehicleRecords(filteredVehicles, role) as any}
        inspections={inspections as any}
        companies={companiesRes.data || []}
        equipmentTypes={equipmentTypesRes.data || []}
        totalCount={displayCount}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        serverSearch={searchQuery}
        serverFilters={{
          vehicleStatus: isVirtualFilter ? rawStatus : filterStatus,
          company: filterCompany,
          equipmentType: filterEquipmentType,
          category: filterCategory,
          inspectionResult: filterResult,
        }}
      />
    </>
  )
}
