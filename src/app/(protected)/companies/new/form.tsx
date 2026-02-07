'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { sanitizeText } from '@/lib/sanitize'

export function CreateCompanyForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)

    const name = sanitizeText(fd.get('name') as string).slice(0, 100)
    if (!name) {
      setError('Company name is required')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('companies')
      .insert({
        name,
        code: sanitizeText(fd.get('code') as string).slice(0, 20) || null,
        project: sanitizeText(fd.get('project') as string).slice(0, 100) || null,
        gate: sanitizeText(fd.get('gate') as string).slice(0, 50) || null,
      })

    if (insertError) {
      setError('Failed to create company. Please try again.')
      setLoading(false)
      return
    }

    router.push('/companies')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Company Name</label>
          <input type="text" name="name" required className="glass-input" placeholder="Enter company name..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Code</label>
          <input type="text" name="code" className="glass-input" placeholder="Company code (optional)..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Project</label>
          <input type="text" name="project" className="glass-input" placeholder="Project name (optional)..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Gate</label>
          <input type="text" name="gate" className="glass-input" placeholder="Gate (optional)..." />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Company'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
