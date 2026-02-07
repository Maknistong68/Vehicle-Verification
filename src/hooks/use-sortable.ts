'use client'

import { useState, useMemo } from 'react'

export type SortDir = 'asc' | 'desc'

export function useSortable<T>(
  data: T[],
  defaultKey: keyof T & string,
  defaultDir: SortDir = 'asc'
) {
  const [sortKey, setSortKey] = useState<keyof T & string>(defaultKey)
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir)

  const onSort = (key: string) => {
    if (key === sortKey) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key as keyof T & string)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    const arr = [...data]
    arr.sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]

      // Nulls last regardless of direction
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      let cmp = 0

      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        // Active (true) first in asc
        cmp = aVal === bVal ? 0 : aVal ? -1 : 1
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal
      } else {
        const aStr = String(aVal)
        const bStr = String(bVal)
        // Try date comparison
        if (aStr.match(/^\d{4}-\d{2}/) && bStr.match(/^\d{4}-\d{2}/)) {
          cmp = aStr.localeCompare(bStr)
        } else {
          cmp = aStr.localeCompare(bStr, undefined, { sensitivity: 'base' })
        }
      }

      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [data, sortKey, sortDir])

  return { sorted, sortKey, sortDir, onSort }
}
