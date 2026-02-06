'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  currentPage: number
  totalCount: number
  pageSize: number
}

export function Pagination({ currentPage, totalCount, pageSize }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const totalPages = Math.ceil(totalCount / pageSize)

  if (totalPages <= 1) return null

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`?${params.toString()}`)
  }

  // Show at most 5 page buttons centered around current
  const pages: number[] = []
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, start + 4)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-xs text-gray-400">
        Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)}&ndash;{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Prev
        </button>
        {pages[0] > 1 && (
          <>
            <button onClick={() => goToPage(1)} className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded">1</button>
            {pages[0] > 2 && <span className="text-xs text-gray-300 px-1">...</span>}
          </>
        )}
        {pages.map(p => (
          <button
            key={p}
            onClick={() => goToPage(p)}
            className={`px-2.5 py-1.5 text-xs rounded ${p === currentPage ? 'bg-emerald-500 text-white font-medium' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="text-xs text-gray-300 px-1">...</span>}
            <button onClick={() => goToPage(totalPages)} className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded">{totalPages}</button>
          </>
        )}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}
