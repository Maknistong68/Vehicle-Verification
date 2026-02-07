'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { EditableChecklist, ChecklistItem } from '@/components/inspection-checklist'
import { sanitizeText } from '@/lib/sanitize'
import { FAILURE_REASONS } from '@/lib/failure-reasons'

export function SubmitResultForm({ inspectionId }: { inspectionId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [result, setResult] = useState<'pass' | 'fail' | ''>('')
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(new Set())
  const [otherChecked, setOtherChecked] = useState(false)
  const [otherText, setOtherText] = useState('')
  const checklistRef = useRef<ChecklistItem[]>([])
  const router = useRouter()
  const supabase = createClient()

  const toggleReason = (reason: string) => {
    setSelectedReasons(prev => {
      const next = new Set(prev)
      if (next.has(reason)) next.delete(reason)
      else next.add(reason)
      return next
    })
  }

  const buildFailureReason = (): string => {
    const parts = [...selectedReasons]
    if (otherChecked && otherText.trim()) {
      parts.push('Other: ' + otherText.trim())
    }
    return parts.join(', ')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!result) {
      setError('Please select an inspection result')
      setLoading(false)
      return
    }

    // Validate failure reasons when result is fail
    if (result === 'fail') {
      const hasReasons = selectedReasons.size > 0 || (otherChecked && otherText.trim())
      if (!hasReasons) {
        setError('Please select at least one failure reason')
        setLoading(false)
        return
      }
    }

    const fd = new FormData(e.currentTarget)
    const notes = sanitizeText(fd.get('notes') as string).slice(0, 1000)
    const failureReason = result === 'fail' ? sanitizeText(buildFailureReason()).slice(0, 500) : null

    // Update the inspection
    const { error: updateError } = await supabase.from('inspections').update({
      result,
      failure_reason: failureReason,
      notes: notes || null,
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', inspectionId)

    if (updateError) { setError('Failed to submit inspection. Please try again.'); setLoading(false); return }

    // Save checklist items
    const checkedItems = checklistRef.current.filter(item => item.passed !== null)
    if (checkedItems.length > 0) {
      const { error: checklistError } = await supabase.from('inspection_checklist_items').insert(
        checkedItems.map(item => ({
          inspection_id: inspectionId,
          item_name: sanitizeText(item.item_name).slice(0, 200),
          item_description: sanitizeText(item.item_description).slice(0, 500),
          passed: item.passed,
          notes: sanitizeText(item.notes).slice(0, 500) || null,
          checked_at: new Date().toISOString(),
        }))
      )
      if (checklistError) {
        // Non-blocking: inspection is already submitted
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
              <input
                type="radio"
                name="result"
                value="pass"
                required
                className="text-green-500"
                checked={result === 'pass'}
                onChange={() => setResult('pass')}
              />
              <div><p className="text-sm font-medium text-gray-900">PASS</p><p className="text-xs text-gray-400">Vehicle meets all requirements</p></div>
            </label>
            <label className="flex items-center gap-3 p-4 glass-card-interactive cursor-pointer hover:border-red-500/50 has-[:checked]:border-red-500 has-[:checked]:bg-red-500/10 flex-1 min-h-[44px]">
              <input
                type="radio"
                name="result"
                value="fail"
                required
                className="text-red-500"
                checked={result === 'fail'}
                onChange={() => setResult('fail')}
              />
              <div><p className="text-sm font-medium text-gray-900">FAIL</p><p className="text-xs text-gray-400">Vehicle does not meet requirements</p></div>
            </label>
          </div>
        </div>

        {/* Structured failure reasons - only shown when result is fail */}
        {result === 'fail' && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Failure Reasons *</label>
            <p className="text-xs text-gray-400 mb-3">Select all that apply</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FAILURE_REASONS.map(reason => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                    selectedReasons.has(reason)
                      ? 'border-red-300 bg-red-50 text-gray-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedReasons.has(reason)}
                    onChange={() => toggleReason(reason)}
                    className="rounded text-red-500 shrink-0"
                  />
                  {reason}
                </label>
              ))}
              {/* Other option */}
              <label
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                  otherChecked
                    ? 'border-red-300 bg-red-50 text-gray-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={otherChecked}
                  onChange={() => setOtherChecked(!otherChecked)}
                  className="rounded text-red-500 shrink-0"
                />
                Other
              </label>
            </div>
            {otherChecked && (
              <input
                type="text"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Describe the other reason..."
                className="glass-input mt-2 text-sm"
              />
            )}
          </div>
        )}

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
