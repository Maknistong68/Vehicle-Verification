'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { sanitizeText } from '@/lib/sanitize'

interface Props {
  company: {
    id: string
    name: string
    code: string | null
    project: string | null
    gate: string | null
    is_active: boolean
  }
}

export function EditCompanyForm({ company }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isActive, setIsActive] = useState(company.is_active)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const fd = new FormData(e.currentTarget)

    const name = sanitizeText(fd.get('name') as string).slice(0, 100)
    if (!name) {
      setError('Company name is required')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('companies')
      .update({
        name,
        code: sanitizeText(fd.get('code') as string).slice(0, 20) || null,
        project: sanitizeText(fd.get('project') as string).slice(0, 100) || null,
        gate: sanitizeText(fd.get('gate') as string).slice(0, 50) || null,
        is_active: isActive,
      })
      .eq('id', company.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => {
      router.push('/companies')
      router.refresh()
    }, 1000)
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Company Name</label>
          <input type="text" name="name" required className="glass-input" defaultValue={company.name} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Code</label>
          <input type="text" name="code" className="glass-input" defaultValue={company.code || ''} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Project</label>
          <input type="text" name="project" className="glass-input" defaultValue={company.project || ''} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Gate</label>
          <input type="text" name="gate" className="glass-input" defaultValue={company.gate || ''} />
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
            <p className="text-sm text-green-600">Company updated successfully! Redirecting...</p>
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
