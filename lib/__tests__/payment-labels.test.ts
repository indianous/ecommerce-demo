import { describe, expect, it } from 'vitest'
import { paymentMethodLabel, PAYMENT_METHOD_LABELS } from '../payment-labels'

describe('paymentMethodLabel', () => {
  it('rotula cada forma de pagamento', () => {
    expect(paymentMethodLabel('PIX')).toBe('PIX')
    expect(paymentMethodLabel('CREDIT_CARD')).toBe('Cartão de Crédito')
    expect(paymentMethodLabel('BOLETO')).toBe('Boleto')
    expect(paymentMethodLabel('PAY_ON_PICKUP')).toBe('Pagar na retirada')
  })

  it('valor desconhecido devolve o próprio valor', () => {
    expect(paymentMethodLabel('OUTRA')).toBe('OUTRA')
  })

  it('o mapa cobre todas as formas do tipo PaymentMethod', () => {
    expect(Object.keys(PAYMENT_METHOD_LABELS).sort()).toEqual(['BOLETO', 'CREDIT_CARD', 'PAY_ON_PICKUP', 'PIX'])
  })
})
