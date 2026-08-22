type SortDirection = 'asc' | 'desc'
type SortValueType = 'string' | 'number' | 'date'

export function sortTableData<T>(
  data: T[],
  key: keyof T,
  direction: SortDirection,
  type: SortValueType = 'string',
): T[] {
  const factor = direction === 'asc' ? 1 : -1

  return [...data].sort((a, b) => {
    const va = a[key]
    const vb = b[key]

    if (type === 'number') {
      return (Number(va) - Number(vb)) * factor
    }
    if (type === 'date') {
      return (new Date(String(va)).getTime() - new Date(String(vb)).getTime()) * factor
    }
    return String(va).localeCompare(String(vb)) * factor
  })
}
