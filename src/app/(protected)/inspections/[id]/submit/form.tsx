'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function SubmitResultForm({ inspectionId }: { inspectionId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const result = fd.get('result') as string
    const failureReason = fd.get('failure_reason') as string
    const notes = fd.get('notes') as string

    const { error: updateError } = await supabase.from('inspections').update({
      result,
      failure_reason: result === 'fail' ? failureReason : null,
      notes: notes || null,
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', inspectionId)

    if (updateError) { setError(updateError.message); setLoading(false); return }
    router.push('/inspections')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-3">Inspection Result</label>
          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex items-center gap-3 p-4 glass-card-interactive cursor-pointer hover:border-green-500/50 has-[:checked]:border-green-500 has-[:checked]:bg-green-500/10 flex-1 min-h-[44px]">
              <input type="radio" name="result" value="pass" required className="text-green-500" />
              <div><p className="text-sm font-medium text-white">PASS</p><p className="text-xs text-white/40">Vehicle meets all requirements</p></div>
            </label>
            <label className="flex items-center gap-3 p-4 glass-card-interactive cursor-pointer hover:border-red-500/50 has-[:checked]:border-red-500 has-[:checked]:bg-red-500/10 flex-1 min-h-[44px]">
              <input type="radio" name="result" value="fail" required className="text-red-500" />
              <div><p className="text-sm font-medium text-white">FAIL</p><p className="text-xs text-white/40">Vehicle does not meet requirements</p></div>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Failure Reason (if failed)</label>
          <textarea name="failure_reason" rows={3} className="glass-input" placeholder="Describe the reason for failure..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Notes</label>
          <textarea name="notes" rows={3} className="glass-input" placeholder="Additional inspection notes..." />
        </div>
        {error && <div className="p-3 glass-card border-red-400/25"><p className="text-sm text-red-300">{error}</p></div>}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Submitting...' : 'Submit Result'}</button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  )
}
