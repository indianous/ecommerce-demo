import { describe, expect, it } from 'vitest'
import { formatBRL } from '@/lib/format'

describe('formatBRL', () => {
  it('formata número como moeda brasileira', () => {
    expect(formatBRL(299.9)).toBe('R$ 299,90')
  })

  it('formata zero corretamente', () => {
    expect(formatBRL(0)).toBe('R$ 0,00')
  })
})
