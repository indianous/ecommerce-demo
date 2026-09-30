'use client'
import { useState } from 'react'
import { useToast } from '@indianous/base-ds'
import { authFetch } from '@/lib/authFetch'
import { useAuthStore } from '@/stores/auth.store'
import { SocialLinksForm } from '@/components/forms/SocialLinksForm'
import type { SiteSettings } from '@/types'
import { SiteSettingsSection } from './SiteSettingsSection'
import { apiErrorMessage } from '@/lib/api-error'

function SocialLinksEditor({ settings }: { settings: SiteSettings }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [instagramUrl, setInstagramUrl] = useState(settings.instagramUrl ?? '')
  const [tiktokUrl, setTiktokUrl] = useState(settings.tiktokUrl ?? '')
  const [facebookUrl, setFacebookUrl] = useState(settings.facebookUrl ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!accessToken) return
    setSaving(true)
    try {
      const res = await authFetch('/api/site/settings/social-links', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagramUrl, tiktokUrl, facebookUrl }),
      })
      if (!res.ok) {
        toast({ variant: 'destructive', description: await apiErrorMessage(res, 'Erro ao salvar redes sociais.') })
        return
      }
      toast({ variant: 'success', description: 'Redes sociais atualizadas com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar redes sociais.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SocialLinksForm
      instagramUrl={instagramUrl} tiktokUrl={tiktokUrl} facebookUrl={facebookUrl}
      onInstagram={setInstagramUrl} onTiktok={setTiktokUrl} onFacebook={setFacebookUrl}
      onSave={handleSave} saving={saving}
      saveLabel="Salvar redes sociais"
    />
  )
}

export function SiteSocialLinksContent({ backPath }: { backPath: string }) {
  return (
    <SiteSettingsSection slug="social-links" backPath={backPath}>
      {(settings) => <SocialLinksEditor settings={settings} />}
    </SiteSettingsSection>
  )
}
