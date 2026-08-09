import { Button, FormField, Input } from 'base-ds'

interface Props {
  instagramUrl: string
  tiktokUrl: string
  facebookUrl: string
  onInstagram: (v: string) => void
  onTiktok: (v: string) => void
  onFacebook: (v: string) => void
  onSave: () => void
  saving: boolean
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
}: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="Instagram" id="social-instagram">
        <Input
          id="social-instagram"
          type="url"
          value={instagramUrl}
          onChange={(e) => onInstagram(e.target.value)}
          placeholder="https://instagram.com/..."
        />
      </FormField>

      <FormField label="TikTok" id="social-tiktok">
        <Input
          id="social-tiktok"
          type="url"
          value={tiktokUrl}
          onChange={(e) => onTiktok(e.target.value)}
          placeholder="https://tiktok.com/@..."
        />
      </FormField>

      <FormField label="Facebook" id="social-facebook">
        <Input
          id="social-facebook"
          type="url"
          value={facebookUrl}
          onChange={(e) => onFacebook(e.target.value)}
          placeholder="https://facebook.com/..."
        />
      </FormField>

      <div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
