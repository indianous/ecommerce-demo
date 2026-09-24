import { FormField, Select } from 'base-ds'
import type { DistributionCenter } from '@/types'

interface Props {
  centers: DistributionCenter[]
  value: string
  onChange: (centerId: string) => void
}

/** Centros de distribuição ativos para retirada (checkout e pedido manual). */
export function PickupLocationList({ centers, value, onChange }: Props) {
  return (
    <FormField label="Centro de distribuição" id="pickup-location-select">
      <Select
        id="pickup-location-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        options={centers.map((center) => ({
          value: center.id,
          label: `${center.name} — ${center.city}/${center.state}`,
        }))}
      />
    </FormField>
  )
}
