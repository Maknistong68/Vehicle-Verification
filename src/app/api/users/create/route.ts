import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_ROLES = ['admin', 'inspector', 'contractor', 'verifier'] as const
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: callerProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || !['owner', 'admin'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, full_name, role, phone } = body

    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate email format and length
    if (typeof email !== 'string' || email.length > 254 || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Validate password length
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be between 8 and 128 characters' }, { status: 400 })
    }

    // Validate full name length
    if (typeof full_name !== 'string' || full_name.trim().length === 0 || full_name.length > 100) {
      return NextResponse.json({ error: 'Full name must be between 1 and 100 characters' }, { status: 400 })
    }

    // Validate role is an allowed enum value
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Validate phone if provided
    if (phone != null && (typeof phone !== 'string' || phone.length > 20)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    // Admins cannot create owners or other admins
    if (callerProfile.role === 'admin' && ['owner', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions for this role' }, { status: 403 })
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name.trim(),
          role,
        },
      },
    })

    if (authError) {
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: full_name.trim(),
        role,
        phone: phone?.trim() || null,
        is_active: true,
      })

    if (profileError) {
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
    }

    // Log the action — check for failure
    const { error: auditError } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      user_role: callerProfile.role,
      action: 'CREATE',
      table_name: 'user_profiles',
      record_id: authData.user.id,
      new_values: { email, full_name: full_name.trim(), role },
    })

    if (auditError) {
      console.error('[Audit] Failed to log user creation:', auditError.message)
    }

    return NextResponse.json({ success: true, userId: authData.user.id })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
