import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// Rate limit: 5 login attempts per 15 minutes per IP
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rateCheck = checkRateLimit(`login:${ip}`, MAX_ATTEMPTS, WINDOW_MS)

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateCheck.resetMs / 1000)),
          },
        }
      )
    }

    const body = await request.json()
    const { email, password } = body

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (email.length > 254 || password.length > 128) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Build a response we can attach cookies to
    const response = NextResponse.json({ success: true })

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          // Parse cookies from the incoming request
          const cookieHeader = request.headers.get('cookie') || ''
          return cookieHeader.split(';').filter(Boolean).map(c => {
            const [name, ...rest] = c.trim().split('=')
            return { name, value: rest.join('=') }
          })
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true,
            })
          })
        },
      },
    })

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Return a fresh response without the auth cookies
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // response already has cookies set by setAll callback
    return NextResponse.json({ success: true, user: { id: data.user.id } }, {
      status: 200,
      headers: response.headers,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
