import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SetupForm } from './setup-form'

export default async function SetupPage() {
  const supabase = await createClient()

  // Check if any owner account already exists — if so, block setup entirely
  const { count } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'owner')

  if (count && count > 0) {
    redirect('/login')
  }

  return <SetupForm />
}
