import { Button, FormField, Icon, Input, Text } from '@indianous/base-ds'
import { parsePixKey, PIX_KEY_TYPE_LABELS } from '@/lib/pix-key'

interface Props {
  pixKey: string
  holderName: string
  onPixKeyChange: (value: string) => void
  onHolderNameChange: (value: string) => void
  onSave: () => void
  saving: boolean
  saveLabel?: string
}

/** Chave PIX + favorecido. A validação é derivada do valor (mesmas regras do backend), sem estado próprio. */
export function PixKeyForm({
  pixKey,
  holderName,
  onPixKeyChange,
  onHolderNameChange,
  onSave,
  saving,
  saveLabel = 'Salvar',
}: Props) {
  const trimmed = pixKey.trim()
  const parsed = trimmed ? parsePixKey(trimmed) : null
  const invalid = trimmed !== '' && parsed === null

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="Chave PIX" id="pix-key">
        <Input id="pix-key" value={pixKey} onChange={(e) => onPixKeyChange(e.target.value)} />
      </FormField>

      {parsed && (
        <Text size="sm" color="muted">Tipo da chave: {PIX_KEY_TYPE_LABELS[parsed.type]}</Text>
      )}
      {invalid && (
        <Text role="alert" size="sm" color="destructive">
          Chave PIX inválida. Informe um CPF, CNPJ, e-mail, telefone (+55…) ou chave aleatória válidos.
        </Text>
      )}

      <FormField label="Favorecido (opcional)" id="pix-holder">
        <Input id="pix-holder" value={holderName} onChange={(e) => onHolderNameChange(e.target.value)} />
      </FormField>

      <div>
        <Button leftIcon={<Icon name="Save" size="sm" />} type="submit" variant="primary" disabled={!parsed} isLoading={saving}>{saveLabel}</Button>
      </div>
    </form>
  )
}
