'use client'
import { useState } from 'react'
import { useToast } from '@indianous/base-ds'
import { authFetch } from '@/lib/authFetch'
import { useAuthStore } from '@/stores/auth.store'
import { SiteMetadataForm } from '@/components/forms/SiteMetadataForm'
import type { SiteSettings } from '@/types'
import { SiteSettingsSection } from './SiteSettingsSection'

function MetadataEditor({ settings }: { settings: SiteSettings }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [siteTitle, setSiteTitle] = useState(settings.siteTitle ?? '')
  const [defaultDescription, setDefaultDescription] = useState(settings.defaultDescription ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!accessToken) return
    setSaving(true)
    try {
      const res = await authFetch('/api/site/settings/metadata', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteTitle, defaultDescription }),
      })
      if (!res.ok) throw new Error()
      toast({ variant: 'success', description: 'Metadados atualizados com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar metadados.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SiteMetadataForm
      siteTitle={siteTitle} defaultDescription={defaultDescription}
      onSiteTitle={setSiteTitle} onDefaultDescription={setDefaultDescription}
      onSave={handleSave} saving={saving}
      saveLabel="Salvar metadados"
    />
  )
}

export function SiteMetadataContent({ backPath }: { backPath: string }) {
  return (
    <SiteSettingsSection slug="metadata" backPath={backPath}>
      {(settings) => <MetadataEditor settings={settings} />}
    </SiteSettingsSection>
  )
}
