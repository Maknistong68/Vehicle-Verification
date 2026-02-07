'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { sanitizeText } from '@/lib/sanitize'

export function CreateFailureReasonForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)

    const name = sanitizeText(fd.get('name') as string).slice(0, 200)
    if (!name) {
      setError('Failure reason name is required')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('failure_reasons')
      .insert({ name })

    if (insertError) {
      if (insertError.code === '23505') {
        setError('This failure reason already exists.')
      } else {
        setError('Failed to create failure reason. Please try again.')
      }
      setLoading(false)
      return
    }

    router.push('/failure-reasons')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Failure Reason Name</label>
          <input type="text" name="name" required className="glass-input" placeholder="Enter failure reason..." />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Failure Reason'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
