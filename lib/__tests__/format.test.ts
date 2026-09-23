import { describe, expect, it } from 'vitest'
import { formatBRL, formatLocalDateTime, toDateTimeLocalValue } from '@/lib/format'

describe('formatBRL', () => {
  it('formata número como moeda brasileira', () => {
    expect(formatBRL(299.9)).toBe('R$ 299,90')
  })

  it('formata zero corretamente', () => {
    expect(formatBRL(0)).toBe('R$ 0,00')
  })
})

describe('formatLocalDateTime', () => {
  it('formata um LocalDateTime do backend como dd/mm/aaaa hh:mm, sem converter fuso', () => {
    expect(formatLocalDateTime('2026-09-30T23:59:00')).toBe('30/09/2026 23:59')
    expect(formatLocalDateTime('2026-01-05T08:07')).toBe('05/01/2026 08:07')
  })

  it('valor vazio ou inválido vira travessão', () => {
    expect(formatLocalDateTime(null)).toBe('—')
    expect(formatLocalDateTime('lixo')).toBe('—')
  })
})

describe('toDateTimeLocalValue', () => {
  it('corta segundos e frações para o formato do input datetime-local', () => {
    expect(toDateTimeLocalValue('2026-09-30T23:59:00')).toBe('2026-09-30T23:59')
    expect(toDateTimeLocalValue('2026-09-30T23:59:00.123')).toBe('2026-09-30T23:59')
  })

  it('valor vazio vira string vazia', () => {
    expect(toDateTimeLocalValue(null)).toBe('')
    expect(toDateTimeLocalValue(undefined)).toBe('')
  })
})
