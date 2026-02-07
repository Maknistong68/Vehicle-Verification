'use client'

import { useState, useMemo } from 'react'
import { SearchBar } from '@/components/search-bar'
import { SortHeader } from '@/components/sort-header'
import { useSortable } from '@/hooks/use-sortable'
import Link from 'next/link'

interface FailureReason {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

interface Props {
  failureReasons: FailureReason[]
}

export function FailureReasonsList({ failureReasons }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return failureReasons
    const q = search.toLowerCase()
    return failureReasons.filter(fr => fr.name.toLowerCase().includes(q))
  }, [failureReasons, search])

  const { sorted, sortKey, sortDir, onSort } = useSortable(filtered, 'name')

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by name..." />

      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <SortHeader label="Name" sortKey="name" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />
                <SortHeader label="Status" sortKey="is_active" activeSortKey={sortKey} activeSortDir={sortDir} onSort={onSort} />
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((fr) => (
                <tr key={fr.id} className="hover:bg-gray-50">
                  <td className="p-4 text-sm font-medium text-gray-900">{fr.name}</td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${
                      fr.is_active
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      {fr.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <Link href={`/failure-reasons/${fr.id}/edit`} className="text-sm text-emerald-600 hover:text-emerald-500 font-medium">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-12 text-center">
                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-gray-400 text-sm">{search ? 'No failure reasons match your search' : 'No failure reasons found'}</p>
                    {!search && <p className="text-gray-300 text-xs mt-1">Add a failure reason to get started</p>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {sorted.map((fr) => (
          <Link key={fr.id} href={`/failure-reasons/${fr.id}/edit`} className="block glass-card-interactive p-3.5">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-gray-900">{fr.name}</p>
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border shrink-0 ${
                fr.is_active
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-500 border-gray-200'
              }`}>
                {fr.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-gray-400 text-sm">{search ? 'No failure reasons match your search' : 'No failure reasons found'}</p>
            {!search && <p className="text-gray-300 text-xs mt-1">Add a failure reason to get started</p>}
          </div>
        )}
      </div>
    </>
  )
}
