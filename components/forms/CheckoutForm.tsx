'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { Button, FormField, Icon, Radio, Select, Text, useToast } from '@indianous/base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore, selectCartTotal } from '@/stores/cart.store'
import { ManualPaymentInstructions } from '@/components/payment/ManualPaymentInstructions'
import { CouponField } from '@/components/forms/CouponField'
import { EmailVerificationCard } from '@/components/layout/EmailVerificationCard'
import { PickupLocationList } from '@/components/checkout-shared/PickupLocationList'
import { ShippingOptionsList } from '@/components/checkout-shared/ShippingOptionsList'
import { PAYMENT_METHOD_LABELS } from '@/lib/payment-labels'
import type {
  Address,
  CouponValidation,
  DeliveryMethod,
  DistributionCenter,
  OrderResponse,
  PaymentMethod,
  PaymentMethodsByDelivery,
  ShippingQuote,
} from '@/types'

interface Props {
  addresses: Address[]
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function CheckoutForm({ addresses }: Props) {
  const { accessToken } = useAuthStore()
  const user = useAuthStore((s) => s.user)
  const markEmailUnverified = useAuthStore((s) => s.markEmailUnverified)
  const { items, clearCart } = useCartStore()
  const cartTotal = useCartStore(selectCartTotal)
  const { toast } = useToast()

  const [selectedAddressId, setSelectedAddressId] = useState(addresses[0]?.id ?? '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsByDelivery | null>(null)
  const [paymentMethodsError, setPaymentMethodsError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<OrderResponse | null>(null)

  const [shippingOptions, setShippingOptions] = useState<ShippingQuote[]>([])
  const [shippingFree, setShippingFree] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)

  const [distributionCenters, setDistributionCenters] = useState<DistributionCenter[]>([])
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('DELIVERY')
  const [selectedPickupLocationId, setSelectedPickupLocationId] = useState('')

  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponApplying, setCouponApplying] = useState(false)
  // O backend pode barrar mesmo com o store dizendo verificado (ex.: e-mail trocado em outra aba).
  const [blockedByVerification, setBlockedByVerification] = useState(false)
  const needsEmailVerification =
    blockedByVerification || (user?.role === 'CUSTOMER' && user.emailVerified === false)

  useEffect(() => {
    fetch('/api/site/payment-methods')
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data: PaymentMethodsByDelivery) => setPaymentMethods(data))
      .catch(() => setPaymentMethodsError(true))
  }, [])

  // As formas de pagamento vêm por tipo de entrega. Sem forma para a entrega (ex.: sem chave PIX,
  // o cliente só tem "pagar na retirada"), a retirada passa a ser a única opção.
  const pickupAllowed = distributionCenters.length > 0 && (paymentMethods?.PICKUP.length ?? 0) > 0
  const deliveryAllowed = (paymentMethods?.DELIVERY.length ?? 0) > 0
  let effectiveDelivery: DeliveryMethod = deliveryMethod
  if (paymentMethods) {
    if (deliveryMethod === 'DELIVERY' && !deliveryAllowed && pickupAllowed) effectiveDelivery = 'PICKUP'
    else if (deliveryMethod === 'PICKUP' && !pickupAllowed && deliveryAllowed) effectiveDelivery = 'DELIVERY'
  }
  const acceptedMethods = paymentMethods?.[effectiveDelivery] ?? []
  const effectiveMethod: PaymentMethod | null =
    paymentMethod && acceptedMethods.includes(paymentMethod) ? paymentMethod : (acceptedMethods[0] ?? null)
  const nothingAvailable = paymentMethods !== null && !deliveryAllowed && !pickupAllowed
  const paymentMethodsLoaded = paymentMethods !== null

  useEffect(() => {
    fetch('/api/site/distribution-centers')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: DistributionCenter[]) => {
        setDistributionCenters(data)
        setSelectedPickupLocationId((current) => current || (data[0]?.id ?? ''))
      })
      .catch(() => setDistributionCenters([]))
  }, [])

  useEffect(() => {
    if (effectiveDelivery !== 'DELIVERY' || !selectedAddressId || !accessToken || !paymentMethodsLoaded) return

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
  }, [selectedAddressId, accessToken, effectiveDelivery, paymentMethodsLoaded])

  const isPickup = effectiveDelivery === 'PICKUP'
  const selectedOption = shippingOptions.find((o) => o.serviceId === selectedServiceId)
  const shippingCost = isPickup || shippingFree ? 0 : (selectedOption?.price ?? 0)
  const discount = appliedCoupon?.discountAmount ?? 0
  const total = cartTotal - discount + shippingCost
  const shippingChosen = isPickup ? !!selectedPickupLocationId : (shippingFree || !!selectedServiceId)

  /** Confere o cupom contra o carrinho; devolve a mensagem de erro, ou null se valeu. */
  const checkCoupon = async (code: string): Promise<{ ok: CouponValidation } | { error: string }> => {
    try {
      const res = await authFetch('/api/cart/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) return { error: (data as { message?: string } | null)?.message ?? 'Cupom inválido' }
      return { ok: data as CouponValidation }
    } catch {
      return { error: 'Não foi possível conferir o cupom. Tente novamente.' }
    }
  }

  const applyCoupon = async () => {
    setCouponApplying(true)
    const result = await checkCoupon(couponCode.trim())
    setCouponApplying(false)
    if ('ok' in result) {
      setAppliedCoupon(result.ok)
      setCouponError(null)
    } else {
      setCouponError(result.error)
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    setCouponError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAddressId || items.length === 0 || !shippingChosen || !effectiveMethod) return

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
          paymentMethod: effectiveMethod,
          ...(isPickup
            ? { deliveryMethod: 'PICKUP', pickupLocationId: selectedPickupLocationId }
            : (shippingFree ? {} : { shippingServiceId: selectedServiceId })),
          ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
        }),
      })

      const data = await res.json()

      if (res.status === 403 && data.code === 'EMAIL_NOT_VERIFIED') {
        setBlockedByVerification(true)
        markEmailUnverified()
        return
      }

      if (!res.ok) {
        toast({ variant: 'destructive', description: data.message ?? 'Erro ao criar pedido' })
        // 422 também vem de falta de estoque: só tira o cupom se ele deixou mesmo de valer
        if (res.status === 422 && appliedCoupon) {
          const recheck = await checkCoupon(appliedCoupon.code)
          if ('error' in recheck) {
            setAppliedCoupon(null)
            setCouponError(recheck.error)
          }
        }
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
        {order.checkoutUrl && (
          <Button leftIcon={<Icon name="ArrowRight" size="sm" />} as="a" href={order.checkoutUrl} variant="primary">Continuar para pagamento</Button>
        )}
        <ManualPaymentInstructions order={order} />
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

      {paymentMethods && !deliveryAllowed && pickupAllowed && (
        <Text size="sm">No momento, o pagamento é feito somente na retirada.</Text>
      )}

      {paymentMethods && deliveryAllowed && pickupAllowed && (
        <fieldset>
          <legend>Método de entrega</legend>
          <Radio
            id="delivery-method-delivery"
            name="deliveryMethod"
            value="DELIVERY"
            label="Entrega"
            checked={effectiveDelivery === 'DELIVERY'}
            onChange={() => setDeliveryMethod('DELIVERY')}
          />
          <Radio
            id="delivery-method-pickup"
            name="deliveryMethod"
            value="PICKUP"
            label="Retirar em uma loja"
            checked={effectiveDelivery === 'PICKUP'}
            onChange={() => setDeliveryMethod('PICKUP')}
          />
        </fieldset>
      )}

      {isPickup ? (
        <PickupLocationList centers={distributionCenters} value={selectedPickupLocationId} onChange={setSelectedPickupLocationId} />
      ) : (
        selectedAddressId && (
          <ShippingOptionsList
            loading={shippingLoading}
            error={shippingError}
            free={shippingFree}
            options={shippingOptions}
            selectedServiceId={selectedServiceId}
            onSelect={setSelectedServiceId}
          />
        )
      )}

      <fieldset>
        <legend>Forma de pagamento</legend>
        {paymentMethodsError ? (
          <Text role="alert" size="sm" color="destructive">Não foi possível carregar as formas de pagamento.</Text>
        ) : nothingAvailable ? (
          <Text role="alert" size="sm" color="destructive">Nenhuma forma de pagamento disponível no momento.</Text>
        ) : (
          acceptedMethods.map((method) => (
            <Radio
              key={method}
              id={`payment-${method}`}
              name="paymentMethod"
              value={method}
              label={PAYMENT_METHOD_LABELS[method]}
              checked={effectiveMethod === method}
              onChange={() => setPaymentMethod(method)}
            />
          ))
        )}
      </fieldset>

      <CouponField
        code={couponCode}
        onCodeChange={(code) => { setCouponCode(code); setCouponError(null) }}
        onApply={() => void applyCoupon()}
        onRemove={removeCoupon}
        applied={appliedCoupon}
        error={couponError}
        applying={couponApplying}
      />

      {appliedCoupon && (
        <Text size="sm">Desconto ({appliedCoupon.code}): − {formatBRL(appliedCoupon.discountAmount)}</Text>
      )}
      <p>Total: {formatBRL(total)}</p>

      {needsEmailVerification ? (
        <EmailVerificationCard email={user?.email} />
      ) : (
        <Button leftIcon={<Icon name="Check" size="sm" />} type="submit" variant="primary" disabled={items.length === 0 || !selectedAddressId || !shippingChosen || !effectiveMethod} isLoading={loading}>Finalizar Pedido</Button>
      )}
    </form>
  )
}
