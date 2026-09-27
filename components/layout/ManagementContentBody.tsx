import type { ReactNode } from 'react'
import { Skeleton, Text } from '@indianous/base-ds'

interface ManagementContentBodyProps {
  loading: boolean
  empty: boolean
  emptyMessage: string
  loadingLabel?: string
  children: ReactNode
}

export function ManagementContentBody({
  loading,
  empty,
  emptyMessage,
  loadingLabel = 'Carregando...',
  children,
}: ManagementContentBodyProps) {
  if (loading) {
    return (
      <div role="status" aria-label={loadingLabel}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="line" height={40} className="mb-2" />
        ))}
      </div>
    )
  }

  if (empty) {
    return <Text size="sm" color="muted">{emptyMessage}</Text>
  }

  return <>{children}</>
}
