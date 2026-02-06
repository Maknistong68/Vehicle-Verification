'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function VerifyForm({ inspectionId }: { inspectionId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleVerify = async () => {
    setLoading(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()

    const { error: updateError } = await supabase.from('inspections').update({
      verified_by: user?.id,
      verified_at: new Date().toISOString(),
    }).eq('id', inspectionId)

    if (updateError) { setError(updateError.message); setLoading(false); return }
    router.push('/inspections')
    router.refresh()
  }

  return (
    <div className="glass-card p-5 md:p-6">
      <p className="text-sm text-white/70 mb-4">By confirming, you acknowledge that you have reviewed this inspection result.</p>
      {error && <div className="p-3 glass-card border-red-400/25 mb-4"><p className="text-sm text-red-300">{error}</p></div>}
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={handleVerify} disabled={loading} className="btn-primary gradient-cyan-blue">{loading ? 'Confirming...' : 'Confirm & Verify'}</button>
        <button onClick={() => router.back()} className="btn-secondary">Cancel</button>
      </div>
    </div>
  )
}
