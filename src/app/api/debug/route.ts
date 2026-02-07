import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        step: 'auth',
        error: authError?.message || 'No user session',
        user: null,
      })
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .single()

    // Try count
    const vehicleCountRes = await supabase
      .from('vehicles_equipment')
      .select('*', { count: 'exact', head: true })

    // Try fetching 3 rows
    const vehicleSampleRes = await supabase
      .from('vehicles_equipment')
      .select('id, plate_number, status')
      .limit(3)

    // Try fetching with no RLS columns
    const vehicleIdRes = await supabase
      .from('vehicles_equipment')
      .select('id')
      .limit(1)

    const { count: companyCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })

    const { count: equipCount } = await supabase
      .from('equipment_types')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      profile,
      profileError: profileError?.message || null,
      vehicleCount: vehicleCountRes.count,
      vehicleCountError: vehicleCountRes.error,
      vehicleCountStatus: vehicleCountRes.status,
      vehicleCountStatusText: vehicleCountRes.statusText,
      vehicleSample: vehicleSampleRes.data,
      vehicleSampleError: vehicleSampleRes.error,
      vehicleIdSample: vehicleIdRes.data,
      vehicleIdError: vehicleIdRes.error,
      companyCount,
      equipCount,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
