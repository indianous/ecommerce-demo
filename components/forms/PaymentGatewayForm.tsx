import { Badge, Button, FormField, Icon, Radio, Text } from 'base-ds'
import type { PaymentGatewayConfig, PaymentGatewayProvider } from '@/types'

interface Props {
  config: PaymentGatewayConfig
  value: PaymentGatewayProvider
  onChange: (provider: PaymentGatewayProvider) => void
  onSave: () => void
  saving: boolean
  error?: string | null
  saveLabel?: string
}

const LABELS: Record<PaymentGatewayProvider, string> = {
  MOCK: 'Mock (dev/demo)',
  STRIPE: 'Stripe',
  PAGSEGURO: 'PagSeguro/PagBank',
}

export function PaymentGatewayForm({ config, value, onChange, onSave, saving, error, saveLabel = 'Salvar' }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="Gateway de pagamento ativo" id="payment-gateway-options">
        <div className="flex flex-col gap-3">
          {config.available.map((option) => (
            <div key={option.provider} className="flex items-center gap-2">
              <Radio
                id={`payment-gateway-${option.provider}`}
                name="paymentGateway"
                value={option.provider}
                label={LABELS[option.provider]}
                checked={value === option.provider}
                disabled={!option.configured}
                onChange={() => onChange(option.provider)}
              />
              {option.provider === config.active && (
                <Badge variant="default" size="sm">
                  Ativo
                </Badge>
              )}
              {!option.configured && (
                <Text size="sm" color="muted">
                  Credenciais não configuradas no servidor
                </Text>
              )}
            </div>
          ))}
        </div>
      </FormField>

      {error && (
        <Text size="sm" color="destructive">
          {error}
        </Text>
      )}

      <div>
        <Button leftIcon={<Icon name="Save" size="sm" />} type="submit" variant="primary" isLoading={saving}>{saveLabel}</Button>
      </div>
    </form>
  )
}
