import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = 'https://aofcbnwdjsziymunnpvv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvZmNibndkanN6aXltdW5ucHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzcyMTUsImV4cCI6MjA4NTk1MzIxNX0.DJ1jD9_5aC538mOkmvDj321nGblwA90Tvmv39leHxy8'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY
  )
}
