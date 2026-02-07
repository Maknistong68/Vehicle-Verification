'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  assignmentId: string
  currentStatus: string
}

export function AssignmentActions({ assignmentId, currentStatus }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleStatusChange = async (newStatus: string) => {
    setLoading(newStatus)
    const { error } = await supabase
      .from('assignments')
      .update({ status: newStatus })
      .eq('id', assignmentId)

    if (error) {
      alert('Failed to update status. Please try again.')
    }
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      {currentStatus !== 'done' && (
        <button
          onClick={() => handleStatusChange('done')}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {loading === 'done' ? 'Updating...' : 'Mark Done'}
        </button>
      )}
      {currentStatus !== 'delayed' && currentStatus !== 'done' && (
        <button
          onClick={() => handleStatusChange('delayed')}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {loading === 'delayed' ? 'Updating...' : 'Mark Delayed'}
        </button>
      )}
    </div>
  )
}
