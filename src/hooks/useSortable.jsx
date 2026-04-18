import { useState, useMemo } from 'react'

export function useSortable(rows, defaultKey = null, defaultDir = 'asc') {
  const [sortKey, setSortKey] = useState(defaultKey)
  const [sortDir, setSortDir] = useState(defaultDir)

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? (typeof a[sortKey] === 'number' ? -Infinity : '')
      const bv = b[sortKey] ?? (typeof b[sortKey] === 'number' ? -Infinity : '')
      const cmp = typeof av === 'string'
        ? av.localeCompare(bv)
        : av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortKey, sortDir])

  function SortIcon({ colKey }) {
    if (sortKey !== colKey) return <span style={{ opacity: .25, marginLeft: 3, fontSize: '0.6em' }}>⇅</span>
    return <span style={{ marginLeft: 3, fontSize: '0.65em' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return { sorted, sortKey, sortDir, handleSort, SortIcon }
}
