'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { Button, FormField, Icon, QrCode, Radio, Select, Text, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore, selectCartTotal } from '@/stores/cart.store'
import type { Address, OrderResponse, PaymentMethod, ShippingQuote } from '@/types'

interface Props {
  addresses: Address[]
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  PIX: 'Pix',
  CREDIT_CARD: 'Cartão de Crédito',
  BOLETO: 'Boleto',
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function CheckoutForm({ addresses }: Props) {
  const { accessToken } = useAuthStore()
  const { items, clearCart } = useCartStore()
  const cartTotal = useCartStore(selectCartTotal)
  const { toast } = useToast()

  const [selectedAddressId, setSelectedAddressId] = useState(addresses[0]?.id ?? '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<OrderResponse | null>(null)

  const [shippingOptions, setShippingOptions] = useState<ShippingQuote[]>([])
  const [shippingFree, setShippingFree] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedAddressId || !accessToken) return

    let cancelled = false
    setShippingLoading(true)
    setShippingError(null)
    setShippingOptions([])
    setShippingFree(false)
    setSelectedServiceId('')

    authFetch('/api/shipping/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ addressId: selectedAddressId }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setShippingError(data.message ?? 'Erro ao calcular o frete')
          return
        }
        if (data.freeShipping) {
          setShippingFree(true)
        } else {
          setShippingOptions(data.options ?? [])
        }
      })
      .catch(() => {
        if (!cancelled) setShippingError('Erro ao calcular o frete')
      })
      .finally(() => {
        if (!cancelled) setShippingLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedAddressId, accessToken])

  const selectedOption = shippingOptions.find((o) => o.serviceId === selectedServiceId)
  const shippingCost = shippingFree ? 0 : (selectedOption?.price ?? 0)
  const total = cartTotal + shippingCost
  const shippingChosen = shippingFree || !!selectedServiceId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAddressId || items.length === 0 || !shippingChosen) return

    setLoading(true)

    try {
      const res = await authFetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { } : {}),
        },
        body: JSON.stringify({
          addressId: selectedAddressId,
          paymentMethod,
          ...(shippingFree ? {} : { shippingServiceId: selectedServiceId }),
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
        {order.checkoutUrl ? (
          <Button iconOnly leftIcon={<Icon name="ArrowRight" size="sm" />} aria-label="Continuar para pagamento" as="a" href={order.checkoutUrl} variant="primary" />
        ) : (
          order.paymentMethod === 'PIX' && order.paymentId && <QrCode value={order.paymentId} />
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

      {selectedAddressId && (
        <fieldset>
          <legend>Frete</legend>
          {shippingLoading && <Text size="sm" color="muted">Calculando frete...</Text>}
          {shippingError && <Text role="alert" size="sm" color="destructive">{shippingError}</Text>}
          {!shippingLoading && !shippingError && shippingFree && (
            <Text size="sm">Frete grátis</Text>
          )}
          {!shippingLoading && !shippingError && !shippingFree && shippingOptions.map((option) => (
            <Radio
              key={option.serviceId}
              id={`shipping-${option.serviceId}`}
              name="shippingServiceId"
              value={option.serviceId}
              label={`${option.carrierName} — ${option.serviceName} — ${formatBRL(option.price)} — ${option.deliveryDays} dia(s)`}
              checked={selectedServiceId === option.serviceId}
              onChange={() => setSelectedServiceId(option.serviceId)}
            />
          ))}
        </fieldset>
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

      <p>Total: {formatBRL(total)}</p>

      <Button iconOnly leftIcon={<Icon name="Check" size="sm" />} aria-label="Finalizar Pedido" type="submit" variant="primary" disabled={items.length === 0 || !selectedAddressId || !shippingChosen} isLoading={loading} />
    </form>
  )
}
