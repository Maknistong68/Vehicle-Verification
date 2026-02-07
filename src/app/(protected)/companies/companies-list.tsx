'use client'

import { useState, useMemo } from 'react'
import { SearchBar } from '@/components/search-bar'
import Link from 'next/link'

interface Company {
  id: string
  name: string
  code: string | null
  project: string | null
  gate: string | null
  is_active: boolean
  created_at: string
}

interface Props {
  companies: Company[]
}

export function CompaniesList({ companies }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return companies
    const q = search.toLowerCase()
    return companies.filter(c => {
      const name = c.name.toLowerCase()
      const code = (c.code || '').toLowerCase()
      const project = (c.project || '').toLowerCase()
      const gate = (c.gate || '').toLowerCase()
      return name.includes(q) || code.includes(q) || project.includes(q) || gate.includes(q)
    })
  }, [companies, search])

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, code, project, gate..." />

      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Gate</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-4 text-sm font-medium text-gray-900">{c.name}</td>
                  <td className="p-4 text-sm text-gray-600">{c.code || '\u2014'}</td>
                  <td className="p-4 text-sm text-gray-600">{c.project || '\u2014'}</td>
                  <td className="p-4 text-sm text-gray-600">{c.gate || '\u2014'}</td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${
                      c.is_active
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <Link href={`/companies/${c.id}/edit`} className="text-sm text-emerald-600 hover:text-emerald-500 font-medium">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-gray-400 text-sm">{search ? 'No companies match your search' : 'No companies found'}</p>
                    {!search && <p className="text-gray-300 text-xs mt-1">Add a company to get started</p>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.map((c) => (
          <Link key={c.id} href={`/companies/${c.id}/edit`} className="block glass-card-interactive p-3.5">
            <div className="flex items-start justify-between mb-1.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{c.name}</p>
                {c.code && <p className="text-xs text-gray-500">{c.code}</p>}
              </div>
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border shrink-0 ${
                c.is_active
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-500 border-gray-200'
              }`}>
                {c.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
              {c.project && <span>Project: {c.project}</span>}
              {c.gate && <span>Gate: {c.gate}</span>}
              {!c.project && !c.gate && <span>No project/gate</span>}
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-gray-400 text-sm">{search ? 'No companies match your search' : 'No companies found'}</p>
            {!search && <p className="text-gray-300 text-xs mt-1">Add a company to get started</p>}
          </div>
        )}
      </div>
    </>
  )
}
