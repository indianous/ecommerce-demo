import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateAge } from '@/lib/age'

describe('calculateAge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('retorna null quando birthDate é null', () => {
    expect(calculateAge(null)).toBeNull()
  })

  it('retorna a idade correta quando o aniversário já passou este ano', () => {
    vi.setSystemTime(new Date('2026-08-20T12:00:00'))
    expect(calculateAge('1996-03-20')).toBe(30)
  })

  it('não arredonda pra cima antes do aniversário chegar este ano', () => {
    vi.setSystemTime(new Date('2026-08-20T12:00:00'))
    expect(calculateAge('1996-12-25')).toBe(29)
  })

  it('conta o aniversário no próprio dia', () => {
    vi.setSystemTime(new Date('2026-08-20T12:00:00'))
    expect(calculateAge('1996-08-20')).toBe(30)
  })
})
