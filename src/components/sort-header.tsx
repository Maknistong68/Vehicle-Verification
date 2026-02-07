'use client'

import { SortDir } from '@/hooks/use-sortable'

interface SortHeaderProps {
  label: string
  sortKey: string
  activeSortKey: string
  activeSortDir: SortDir
  onSort: (key: string) => void
  className?: string
}

export function SortHeader({ label, sortKey, activeSortKey, activeSortDir, onSort, className }: SortHeaderProps) {
  const isActive = sortKey === activeSortKey

  return (
    <th
      className={`text-left p-4 text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700 transition-colors ${className || ''}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {activeSortDir === 'asc' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            )}
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        )}
      </span>
    </th>
  )
}
