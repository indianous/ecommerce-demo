'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore, selectCartTotal } from '@/stores/cart.store'
import type { Address, OrderResponse, PaymentMethod } from '@/types'

interface Props {
  addresses: Address[]
}

export function CheckoutForm({ addresses }: Props) {
  const { accessToken } = useAuthStore()
  const { items, clearCart } = useCartStore()
  const total = useCartStore(selectCartTotal)

  const [selectedAddressId, setSelectedAddressId] = useState(addresses[0]?.id ?? '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<OrderResponse | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAddressId || items.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          addressId: selectedAddressId,
          paymentMethod,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message ?? 'Erro ao criar pedido')
        return
      }

      setOrder(data)
      clearCart()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (order) {
    return (
      <div data-testid="order-success">
        <h2>Pedido realizado com sucesso!</h2>
        <p>Número do pedido: {order.id}</p>
        {order.paymentId && (
          <p>
            Código de pagamento: <strong>{order.paymentId}</strong>
          </p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="address-select">Endereço de entrega</label>
        {addresses.length > 0 ? (
          <select
            id="address-select"
            value={selectedAddressId}
            onChange={(e) => setSelectedAddressId(e.target.value)}
            required
          >
            {addresses.map((addr) => (
              <option key={addr.id} value={addr.id}>
                {addr.street}, {addr.number} — {addr.city}/{addr.state}
              </option>
            ))}
          </select>
        ) : (
          <p>Nenhum endereço cadastrado.</p>
        )}
      </div>

      <fieldset>
        <legend>Forma de pagamento</legend>
        {(['PIX', 'CREDIT_CARD', 'BOLETO'] as const).map((method) => (
          <label key={method}>
            <input
              type="radio"
              name="paymentMethod"
              value={method}
              checked={paymentMethod === method}
              onChange={() => setPaymentMethod(method)}
            />
            {method === 'PIX' ? 'Pix' : method === 'CREDIT_CARD' ? 'Cartão de Crédito' : 'Boleto'}
          </label>
        ))}
      </fieldset>

      <p>Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</p>

      {error && <p role="alert">{error}</p>}

      <button
        type="submit"
        disabled={loading || items.length === 0 || !selectedAddressId}
      >
        {loading ? 'Processando...' : 'Finalizar Pedido'}
      </button>
    </form>
  )
}
