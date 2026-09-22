import { describe, expect, it } from 'vitest'
import { paymentMethodLabel, paymentProviderLabel, PAYMENT_METHOD_LABELS } from '../payment-labels'

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

describe('paymentProviderLabel', () => {
  it('rotula o gateway que criou o pagamento', () => {
    expect(paymentProviderLabel('PAGSEGURO')).toBe('PagBank')
    expect(paymentProviderLabel('STRIPE')).toBe('Stripe')
    expect(paymentProviderLabel('MANUAL')).toBe('Pagamento manual')
  })

  it('pedido antigo (sem gateway) ou valor desconhecido: null', () => {
    expect(paymentProviderLabel(undefined)).toBeNull()
    expect(paymentProviderLabel(null)).toBeNull()
    expect(paymentProviderLabel('OUTRO')).toBeNull()
  })
})
