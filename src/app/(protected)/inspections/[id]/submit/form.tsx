'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { EditableChecklist, ChecklistItem } from '@/components/inspection-checklist'

export function SubmitResultForm({ inspectionId }: { inspectionId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const checklistRef = useRef<ChecklistItem[]>([])
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

    // Update the inspection
    const { error: updateError } = await supabase.from('inspections').update({
      result,
      failure_reason: result === 'fail' ? failureReason : null,
      notes: notes || null,
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', inspectionId)

    if (updateError) { setError(updateError.message); setLoading(false); return }

    // Save checklist items
    const checkedItems = checklistRef.current.filter(item => item.passed !== null)
    if (checkedItems.length > 0) {
      const { error: checklistError } = await supabase.from('inspection_checklist_items').insert(
        checkedItems.map(item => ({
          inspection_id: inspectionId,
          item_name: item.item_name,
          item_description: item.item_description,
          passed: item.passed,
          notes: item.notes,
          checked_at: new Date().toISOString(),
        }))
      )
      if (checklistError) {
        // Non-blocking: inspection is already submitted, just log
        console.error('Failed to save checklist:', checklistError.message)
      }
    }

    setSuccess(true)
    setTimeout(() => {
      router.push('/inspections')
      router.refresh()
    }, 1000)
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        {/* Checklist section */}
        <EditableChecklist onChange={(items) => { checklistRef.current = items }} />

        <hr className="border-gray-200" />

        {/* Result selection */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-3">Inspection Result</label>
          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex items-center gap-3 p-4 glass-card-interactive cursor-pointer hover:border-green-500/50 has-[:checked]:border-green-500 has-[:checked]:bg-green-500/10 flex-1 min-h-[44px]">
              <input type="radio" name="result" value="pass" required className="text-green-500" />
              <div><p className="text-sm font-medium text-gray-900">PASS</p><p className="text-xs text-gray-400">Vehicle meets all requirements</p></div>
            </label>
            <label className="flex items-center gap-3 p-4 glass-card-interactive cursor-pointer hover:border-red-500/50 has-[:checked]:border-red-500 has-[:checked]:bg-red-500/10 flex-1 min-h-[44px]">
              <input type="radio" name="result" value="fail" required className="text-red-500" />
              <div><p className="text-sm font-medium text-gray-900">FAIL</p><p className="text-xs text-gray-400">Vehicle does not meet requirements</p></div>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Failure Reason (if failed)</label>
          <textarea name="failure_reason" rows={3} className="glass-input" placeholder="Describe the reason for failure..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Notes</label>
          <textarea name="notes" rows={3} className="glass-input" placeholder="Additional inspection notes..." />
        </div>
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}
        {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-sm text-green-600">Inspection submitted successfully! Redirecting...</p></div>}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Submitting...' : 'Submit Result'}</button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  )
}
