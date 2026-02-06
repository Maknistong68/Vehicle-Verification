import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { UserRole } from '@/lib/types'
import { RoleProvider } from '@/lib/role-context'
import { POVBanner } from '@/components/pov-banner'

export const dynamic = 'force-dynamic'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If no profile exists, show setup prompt instead of redirect-looping
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-500 text-sm mb-4">
            {error
              ? `Database error: ${error.message}. Make sure the SQL migration has been run in Supabase SQL Editor.`
              : 'No user profile found for your account. Please create one via the Setup page.'}
          </p>
          <a href="/setup" className="btn-primary inline-block">Go to Setup</a>
          <p className="mt-4 text-xs text-gray-400">
            If you already ran the migration, go to <a href="/setup" className="text-emerald-600 underline">/setup</a> to create your Owner account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <RoleProvider actualRole={profile.role as UserRole}>
      <div className="min-h-screen md:flex">
        <Sidebar
          userRole={profile.role as UserRole}
          userName={profile.full_name}
          userEmail={profile.email}
        />
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <POVBanner />
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </RoleProvider>
  )
}
