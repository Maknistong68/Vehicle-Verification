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

    const { count: vehicleCount, error: vehicleError } = await supabase
      .from('vehicles_equipment')
      .select('*', { count: 'exact', head: true })

    const { count: companyCount, error: companyError } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      profile,
      profileError: profileError?.message || null,
      vehicleCount,
      vehicleError: vehicleError?.message || null,
      companyCount,
      companyError: companyError?.message || null,
      envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
