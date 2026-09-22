import { describe, expect, it } from 'vitest'
import { payNowState } from '../payment-checkout'

const NOW = Date.parse('2026-09-21T12:00:00Z')

const pending = { paymentStatus: 'PENDING' as const, checkoutUrl: 'https://pay.example.com/x' }

describe('payNowState', () => {
  it('pagamento pendente com link e sem validade: "pay"', () => {
    expect(payNowState(pending, NOW)).toBe('pay')
  })

  it('pagamento pendente com link e validade no futuro: "pay"', () => {
    expect(payNowState({ ...pending, paymentExpiresAt: '2026-09-22T12:00:00Z' }, NOW)).toBe('pay')
  })

  it('pagamento pendente com validade vencida: "expired"', () => {
    expect(payNowState({ ...pending, paymentExpiresAt: '2026-09-21T11:59:59Z' }, NOW)).toBe('expired')
  })

  it('a validade exatamente agora já conta como vencida', () => {
    expect(payNowState({ ...pending, paymentExpiresAt: '2026-09-21T12:00:00Z' }, NOW)).toBe('expired')
  })

  it('sem link de pagamento (pagamento manual): null', () => {
    expect(payNowState({ paymentStatus: 'PENDING' }, NOW)).toBeNull()
  })

  it.each(['PAID', 'FAILED', 'REFUNDED'] as const)('pagamento %s: null', (paymentStatus) => {
    expect(payNowState({ paymentStatus, checkoutUrl: 'https://pay.example.com/x' }, NOW)).toBeNull()
  })

  it('validade ilegível não trava o cliente: trata como sem validade ("pay")', () => {
    expect(payNowState({ ...pending, paymentExpiresAt: 'lixo' }, NOW)).toBe('pay')
  })
})
