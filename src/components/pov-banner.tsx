'use client'

import { useRole } from '@/lib/role-context'

export function POVBanner() {
  const { isOwnerPOV, effectiveRole, setViewAsRole } = useRole()

  if (!isOwnerPOV) return null

  return (
    <div className="bg-amber-500/15 border border-amber-400/30 backdrop-blur-sm px-4 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span className="text-sm text-amber-200 font-medium truncate">
          Viewing as <span className="capitalize">{effectiveRole}</span>
        </span>
      </div>
      <button
        onClick={() => setViewAsRole(null)}
        className="shrink-0 text-xs font-medium text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1 rounded-md transition-colors"
      >
        Exit POV
      </button>
    </div>
  )
}
