import { useCallback, useState } from 'react'

interface UseRowSelectionResult {
  selectedIds: Set<string>
  toggle: (id: string) => void
  selectAll: (ids: string[]) => void
  clear: () => void
  isSelected: (id: string) => boolean
  selectedCount: number
}

export function useRowSelection(): UseRowSelectionResult {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clear = useCallback(() => setSelectedIds(new Set()), [])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  return { selectedIds, toggle, selectAll, clear, isSelected, selectedCount: selectedIds.size }
}
