import { Button, FormField, Icon, Input } from '@indianous/base-ds'
import { isAbsoluteHttpUrl } from '@/lib/safe-url'

interface Props {
  instagramUrl: string
  tiktokUrl: string
  facebookUrl: string
  onInstagram: (v: string) => void
  onTiktok: (v: string) => void
  onFacebook: (v: string) => void
  onSave: () => void
  saving: boolean
  saveLabel?: string
}

export function SocialLinksForm({
  instagramUrl,
  tiktokUrl,
  facebookUrl,
  onInstagram,
  onTiktok,
  onFacebook,
  onSave,
  saving,
  saveLabel = 'Salvar',
}: Props) {
  const errorFor = (url: string) =>
    url.trim() === '' || isAbsoluteHttpUrl(url) ? undefined : 'Use um endereço começando com https://'
  const instagramError = errorFor(instagramUrl)
  const tiktokError = errorFor(tiktokUrl)
  const facebookError = errorFor(facebookUrl)
  const hasError = !!(instagramError || tiktokError || facebookError)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="Instagram" id="social-instagram" error={instagramError}>
        <Input
          id="social-instagram"
          type="url"
          value={instagramUrl}
          onChange={(e) => onInstagram(e.target.value)}
          placeholder="https://instagram.com/..."
        />
      </FormField>

      <FormField label="TikTok" id="social-tiktok" error={tiktokError}>
        <Input
          id="social-tiktok"
          type="url"
          value={tiktokUrl}
          onChange={(e) => onTiktok(e.target.value)}
          placeholder="https://tiktok.com/@..."
        />
      </FormField>

      <FormField label="Facebook" id="social-facebook" error={facebookError}>
        <Input
          id="social-facebook"
          type="url"
          value={facebookUrl}
          onChange={(e) => onFacebook(e.target.value)}
          placeholder="https://facebook.com/..."
        />
      </FormField>

      <div>
        <Button leftIcon={<Icon name="Save" size="sm" />} type="submit" variant="primary" disabled={hasError} isLoading={saving}>{saveLabel}</Button>
      </div>
    </form>
  )
}
