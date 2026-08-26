import type { ReactNode } from 'react'
import { Button, Icon, Text } from 'base-ds'

interface Props {
  selectedCount: number
  onClear: () => void
  actions?: ReactNode
}

export function SelectionBar({ selectedCount, onClear, actions }: Props) {
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center gap-3 mb-4 p-2 rounded-md bg-muted/50 flex-wrap">
      <Text size="sm">{selectedCount} selecionado{selectedCount === 1 ? '' : 's'}</Text>
      <Button leftIcon={<Icon name="X" size="sm" />} variant="secondary" size="sm" onClick={onClear}>
        Limpar seleção
      </Button>
      {actions}
    </div>
  )
}
