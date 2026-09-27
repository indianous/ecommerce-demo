import { Checkbox, type TableColumn } from '@indianous/base-ds'

export function makeSelectionColumn<T>(
  items: T[],
  getId: (item: T) => string,
  getLabel: (item: T) => string,
  selectedIds: Set<string>,
  onToggle: (id: string) => void,
  onToggleAll: (ids: string[]) => void,
): TableColumn<T> {
  const ids = items.map(getId)
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id))
  const someSelected = !allSelected && ids.some((id) => selectedIds.has(id))

  return {
    key: '__selection__',
    header: (
      <Checkbox
        id="selection-select-all"
        aria-label="Selecionar todos"
        checked={allSelected}
        indeterminate={someSelected}
        onChange={() => onToggleAll(allSelected ? [] : ids)}
      />
    ),
    render: (row) => {
      const id = getId(row)
      return (
        <Checkbox
          id={`selection-${id}`}
          aria-label={`Selecionar ${getLabel(row)}`}
          checked={selectedIds.has(id)}
          onChange={() => onToggle(id)}
        />
      )
    },
  }
}
