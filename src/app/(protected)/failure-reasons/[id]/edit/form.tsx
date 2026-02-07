'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { sanitizeText } from '@/lib/sanitize'

interface Props {
  failureReason: {
    id: string
    name: string
    is_active: boolean
  }
}

export function EditFailureReasonForm({ failureReason }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isActive, setIsActive] = useState(failureReason.is_active)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const fd = new FormData(e.currentTarget)

    const name = sanitizeText(fd.get('name') as string).slice(0, 200)
    if (!name) {
      setError('Failure reason name is required')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('failure_reasons')
      .update({
        name,
        is_active: isActive,
      })
      .eq('id', failureReason.id)

    if (updateError) {
      if (updateError.code === '23505') {
        setError('This failure reason already exists.')
      } else {
        setError('Failed to update failure reason. Please try again.')
      }
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => {
      router.push('/failure-reasons')
      router.refresh()
    }, 1000)
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Failure Reason Name</label>
          <input type="text" name="name" required className="glass-input" defaultValue={failureReason.name} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Status</label>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isActive ? 'bg-emerald-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`ml-3 text-sm ${isActive ? 'text-emerald-600 font-medium' : 'text-gray-500'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">Failure reason updated successfully! Redirecting...</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
