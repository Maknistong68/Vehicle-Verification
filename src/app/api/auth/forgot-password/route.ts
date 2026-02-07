import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// Rate limit: 3 password reset requests per 15 minutes per IP
const MAX_ATTEMPTS = 3
const WINDOW_MS = 15 * 60 * 1000

// Rate-limit gate only — actual reset email is sent client-side via Supabase
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rateCheck = checkRateLimit(`forgot-password:${ip}`, MAX_ATTEMPTS, WINDOW_MS)

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateCheck.resetMs / 1000)),
          },
        }
      )
    }

    return NextResponse.json({ allowed: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
