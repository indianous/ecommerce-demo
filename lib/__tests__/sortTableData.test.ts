import { describe, expect, it } from 'vitest'
import { sortTableData } from '@/lib/sortTableData'

interface Row {
  name: string
  qty: number
  when: string
}

const rows: Row[] = [
  { name: 'Banana', qty: 5, when: '2026-02-01T00:00:00Z' },
  { name: 'Abacaxi', qty: 10, when: '2026-01-01T00:00:00Z' },
  { name: 'Cereja', qty: 1, when: '2026-03-01T00:00:00Z' },
]

describe('sortTableData', () => {
  it('ordena por string, ascendente', () => {
    const sorted = sortTableData(rows, 'name', 'asc', 'string')
    expect(sorted.map((r) => r.name)).toEqual(['Abacaxi', 'Banana', 'Cereja'])
  })

  it('ordena por string, descendente', () => {
    const sorted = sortTableData(rows, 'name', 'desc', 'string')
    expect(sorted.map((r) => r.name)).toEqual(['Cereja', 'Banana', 'Abacaxi'])
  })

  it('ordena por número, ascendente', () => {
    const sorted = sortTableData(rows, 'qty', 'asc', 'number')
    expect(sorted.map((r) => r.qty)).toEqual([1, 5, 10])
  })

  it('ordena por número, descendente', () => {
    const sorted = sortTableData(rows, 'qty', 'desc', 'number')
    expect(sorted.map((r) => r.qty)).toEqual([10, 5, 1])
  })

  it('ordena por data, ascendente', () => {
    const sorted = sortTableData(rows, 'when', 'asc', 'date')
    expect(sorted.map((r) => r.name)).toEqual(['Abacaxi', 'Banana', 'Cereja'])
  })

  it('ordena por data, descendente', () => {
    const sorted = sortTableData(rows, 'when', 'desc', 'date')
    expect(sorted.map((r) => r.name)).toEqual(['Cereja', 'Banana', 'Abacaxi'])
  })

  it('não muta o array original', () => {
    const original = [...rows]
    sortTableData(rows, 'name', 'asc', 'string')
    expect(rows).toEqual(original)
  })
})
