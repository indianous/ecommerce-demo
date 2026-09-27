import { Radio, Text } from '@indianous/base-ds'
import { formatBRL } from '@/lib/format'
import type { ShippingQuote } from '@/types'

interface Props {
  loading: boolean
  error: string | null
  free: boolean
  options: ShippingQuote[]
  selectedServiceId: string
  onSelect: (serviceId: string) => void
}

/** Opções de frete cotadas (checkout e pedido manual). */
export function ShippingOptionsList({ loading, error, free, options, selectedServiceId, onSelect }: Props) {
  return (
    <fieldset>
      <legend>Frete</legend>
      {loading && <Text size="sm" color="muted">Calculando frete...</Text>}
      {error && <Text role="alert" size="sm" color="destructive">{error}</Text>}
      {!loading && !error && free && (
        <Text size="sm">Frete grátis</Text>
      )}
      {!loading && !error && !free && options.map((option) => (
        <Radio
          key={option.serviceId}
          id={`shipping-${option.serviceId}`}
          name="shippingServiceId"
          value={option.serviceId}
          label={`${option.carrierName} — ${option.serviceName} — ${formatBRL(option.price)} — ${option.deliveryDays} dia(s)`}
          checked={selectedServiceId === option.serviceId}
          onChange={() => onSelect(option.serviceId)}
        />
      ))}
    </fieldset>
  )
}
