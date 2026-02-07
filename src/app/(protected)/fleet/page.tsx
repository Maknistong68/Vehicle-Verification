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
  expiringSoon?: string
}

export default async function FleetPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const currentPage = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const searchQuery = params.q || ''
  const filterCompany = params.company || ''       // now a UUID (company_id)
  const filterEquipmentType = params.equipmentType || ''  // now a UUID (equipment_type_id)
  const filterCategory = params.category || ''      // 'vehicle' | 'heavy_equipment'
  const filterResult = params.result || ''

  // Whitelist valid status values to prevent filter injection
  const VALID_STATUSES = ['verified', 'updated_inspection_required', 'inspection_overdue', 'rejected', 'blacklisted']
  // 'expiring_soon' is a virtual filter handled server-side with date range
  const VIRTUAL_STATUSES = ['expiring_soon']
  const rawStatus = params.status || ''
  const isExpiringSoon = rawStatus === 'expiring_soon'
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

  // Pre-fetch equipment_type IDs for category filter (need IDs before building query)
  let categoryEquipmentTypeIds: string[] = []
  if (filterCategory) {
    const { data: catTypes } = await supabase
      .from('equipment_types')
      .select('id')
      .eq('category', filterCategory)
      .eq('is_active', true)
    categoryEquipmentTypeIds = (catTypes || []).map((t: any) => t.id)
  }

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

    // Expiring Soon: verified vehicles with next_inspection_date within 30 days
    if (isExpiringSoon) {
      const nowISO = new Date().toISOString()
      const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      q = q.eq('status', 'verified').gte('next_inspection_date', nowISO).lte('next_inspection_date', in30Days)
    }

    // Company filter (by company_id UUID)
    if (filterCompany) {
      q = q.eq('company_id', filterCompany)
    }

    // Equipment Type filter (by equipment_type_id UUID)
    if (filterEquipmentType) {
      q = q.eq('equipment_type_id', filterEquipmentType)
    }

    // Category filter (match equipment_type IDs with that category)
    if (filterCategory && categoryEquipmentTypeIds.length > 0) {
      q = q.in('equipment_type_id', categoryEquipmentTypeIds)
    } else if (filterCategory && categoryEquipmentTypeIds.length === 0) {
      // No equipment types match this category — force empty result
      q = q.in('equipment_type_id', ['00000000-0000-0000-0000-000000000000'])
    }

    return q
  }

  // Count query
  const { count: totalCount } = await buildQuery(true)

  // When inspection result filter is active, skip pagination (need all vehicles to match against inspections client-side)
  const skipPagination = !!filterResult
  let dataQuery = buildQuery(false)
    .order('created_at', { ascending: false })
  if (!skipPagination) {
    dataQuery = dataQuery.range(from, to)
  } else {
    dataQuery = dataQuery.limit(500)
  }

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
          vehicleStatus: isExpiringSoon ? 'expiring_soon' : filterStatus,
          company: filterCompany,
          equipmentType: filterEquipmentType,
          category: filterCategory,
          inspectionResult: filterResult,
        }}
      />
    </>
  )
}
