'use client'

import { Heading, Image, Text } from 'base-ds'
import { CopyButton } from '@/components/ui/CopyButton'
import { paymentMethodLabel } from '@/lib/payment-labels'
import { useSiteSettings } from '@/lib/useSiteSettings'
import { whatsappUrl } from '@/lib/whatsapp'
import type { OrderResponse } from '@/types'

type OrderForInstructions = Pick<
  OrderResponse,
  'paymentMethod' | 'paymentStatus' | 'paymentId' | 'checkoutUrl' | 'totalAmount' | 'pickupLocation'
>

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

/** Pedido do pagamento manual (sem código nem link de um gateway) que ainda espera o pagamento. */
export function needsManualPaymentInstructions(order: OrderForInstructions): boolean {
  if (order.paymentStatus !== 'PENDING' || order.checkoutUrl) return false
  if (order.paymentMethod === 'PAY_ON_PICKUP') return true
  return order.paymentMethod === 'PIX' && !order.paymentId
}

/** "Como pagar" do pagamento manual: PIX (chave, QR Code, comprovante) ou pagar na retirada. */
export function ManualPaymentInstructions({ order }: { order: OrderForInstructions }) {
  const { settings, loading } = useSiteSettings()

  if (!needsManualPaymentInstructions(order) || loading) return null

  if (order.paymentMethod === 'PAY_ON_PICKUP') {
    const center = order.pickupLocation
    return (
      <section aria-label="Como pagar" className="mt-4 rounded border p-4">
        <Heading as="h3" size="xl" className="mb-2">Como pagar</Heading>
        <Text>
          Pague na retirada em {center?.name ?? 'o local de retirada'}
          {center && ` — ${center.street}, ${center.number} — ${center.city}/${center.state}`}.
        </Text>
      </section>
    )
  }

  const email = settings?.contactEmail?.trim() || null
  const whatsapp = whatsappUrl(settings?.contactPhone)

  return (
    <section aria-label="Como pagar" className="mt-4 rounded border p-4">
      <Heading as="h3" size="xl" className="mb-2">Como pagar ({paymentMethodLabel(order.paymentMethod)})</Heading>

      {settings?.pixKey ? (
        <div className="flex flex-col gap-2">
          <Text>Total a pagar: <strong>{formatBRL(order.totalAmount)}</strong></Text>
          <Text className="inline-flex items-center gap-2">
            Chave PIX: <strong>{settings.pixKey}</strong>
            <CopyButton value={settings.pixKey} label="chave PIX" />
          </Text>
          {settings.pixKeyHolder && <Text>Favorecido: {settings.pixKeyHolder}</Text>}
          {settings.pixQrCodeUrl && (
            <Image src={settings.pixQrCodeUrl} alt="QR Code do PIX" className="max-w-[200px] rounded border" />
          )}

          <Text size="sm" color="muted">
            Depois de pagar, envie o comprovante
            {email && whatsapp && ' por e-mail ou WhatsApp'}
            {email && !whatsapp && ' por e-mail'}
            {!email && whatsapp && ' por WhatsApp'}
            {!email && !whatsapp && ' — entre em contato com a loja'}
            {(email || whatsapp) && ': '}
            {email && <a href={`mailto:${email}`} className="underline">{email}</a>}
            {email && whatsapp && ' · '}
            {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="underline">WhatsApp</a>}
            {(email || whatsapp) && '.'}
          </Text>
        </div>
      ) : (
        <Text>Não foi possível carregar a chave PIX. Entre em contato com a loja.</Text>
      )}
    </section>
  )
}
