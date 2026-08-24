import type { ReactNode } from 'react'
import { SearchField } from 'base-ds'

interface ManagementContentHeaderProps {
  searchId: string
  searchLabel: string
  searchPlaceholder: string
  onSearch: (term: string) => void
  filters?: ReactNode
}

export function ManagementContentHeader({
  searchId,
  searchLabel,
  searchPlaceholder,
  onSearch,
  filters,
}: ManagementContentHeaderProps) {
  return (
    <div className="flex gap-4 mb-4 flex-wrap items-start">
      <SearchField
        id={searchId}
        label={searchLabel}
        placeholder={searchPlaceholder}
        buttonLabel="Buscar"
        buttonIconOnly
        onSearch={onSearch}
        className="flex-1 min-w-40"
      />
      {filters}
    </div>
  )
}
