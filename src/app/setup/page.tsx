import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SetupForm } from './setup-form'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const supabase = await createClient()

  // Check if any owner account already exists — if so, block setup entirely
  // If table doesn't exist yet (fresh DB), treat as no owner → show setup form
  try {
    const { count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'owner')

    if (count && count > 0) {
      redirect('/login')
    }
  } catch {
    // Table may not exist yet — proceed to show setup form
  }

  return <SetupForm />
}
