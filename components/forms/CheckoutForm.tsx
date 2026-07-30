'use client'

import { useState } from 'react'
import { Button, FormField, QrCode, Radio, Select, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore, selectCartTotal } from '@/stores/cart.store'
import type { Address, OrderResponse, PaymentMethod } from '@/types'

interface Props {
  addresses: Address[]
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  PIX: 'Pix',
  CREDIT_CARD: 'Cartão de Crédito',
  BOLETO: 'Boleto',
}

export function CheckoutForm({ addresses }: Props) {
  const { accessToken } = useAuthStore()
  const { items, clearCart } = useCartStore()
  const total = useCartStore(selectCartTotal)
  const { toast } = useToast()

  const [selectedAddressId, setSelectedAddressId] = useState(addresses[0]?.id ?? '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<OrderResponse | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAddressId || items.length === 0) return

    setLoading(true)

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
        toast({ variant: 'destructive', description: data.message ?? 'Erro ao criar pedido' })
        return
      }

      setOrder(data)
      clearCart()
    } catch {
      toast({ variant: 'destructive', description: 'Erro de conexão. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  if (order) {
    return (
      <div data-testid="order-success">
        <h2>Pedido realizado com sucesso!</h2>
        <p>Número do pedido: #{order.orderNumber}</p>
        {order.paymentId && (
          <p>
            Código de pagamento: <strong>{order.paymentId}</strong>
          </p>
        )}
        {order.paymentMethod === 'PIX' && order.paymentId && (
          <QrCode value={order.paymentId} />
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {addresses.length > 0 ? (
        <FormField label="Endereço de entrega" id="address-select">
          <Select
            id="address-select"
            value={selectedAddressId}
            onChange={(e) => setSelectedAddressId(e.target.value)}
            required
            options={addresses.map((addr) => ({
              value: addr.id,
              label: `${addr.street}, ${addr.number} — ${addr.city}/${addr.state}`,
            }))}
          />
        </FormField>
      ) : (
        <p>Nenhum endereço cadastrado.</p>
      )}

      <fieldset>
        <legend>Forma de pagamento</legend>
        {(['PIX', 'CREDIT_CARD', 'BOLETO'] as const).map((method) => (
          <Radio
            key={method}
            id={`payment-${method}`}
            name="paymentMethod"
            value={method}
            label={PAYMENT_LABELS[method]}
            checked={paymentMethod === method}
            onChange={() => setPaymentMethod(method)}
          />
        ))}
      </fieldset>

      <p>Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</p>

      <Button
        type="submit"
        disabled={loading || items.length === 0 || !selectedAddressId}
        isLoading={loading}
      >
        {loading ? 'Processando...' : 'Finalizar Pedido'}
      </Button>
    </form>
  )
}
