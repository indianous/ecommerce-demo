import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatRelativeTime } from '@/lib/relative-time'

const NOW = new Date('2026-08-20T12:00:00Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('formatRelativeTime', () => {
  it('menos de 1 minuto atrás: "agora mesmo"', () => {
    expect(formatRelativeTime('2026-08-20T11:59:30Z')).toBe('agora mesmo')
  })

  it('minutos atrás', () => {
    expect(formatRelativeTime('2026-08-20T11:45:00Z')).toBe('há 15 min')
  })

  it('horas atrás', () => {
    expect(formatRelativeTime('2026-08-20T09:00:00Z')).toBe('há 3h')
  })

  it('dias atrás', () => {
    expect(formatRelativeTime('2026-08-17T12:00:00Z')).toBe('há 3d')
  })
})
