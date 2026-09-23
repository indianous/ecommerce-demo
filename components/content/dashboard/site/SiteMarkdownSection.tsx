'use client'
import { useState } from 'react'
import { useToast } from 'base-ds'
import { authFetch } from '@/lib/authFetch'
import { useAuthStore } from '@/stores/auth.store'
import { MarkdownContentForm } from '@/components/forms/MarkdownContentForm'
import type { SiteSectionId } from '@/lib/site-sections'
import type { SiteSettings } from '@/types'
import { SiteSettingsSection } from './SiteSettingsSection'

export interface MarkdownSectionConfig {
  slug: SiteSectionId
  /** Endpoint `PUT` do BFF (recebe `{ content }`). */
  endpoint: string
  /** Campo de `SiteSettings` com o conteúdo atual. */
  field: 'aboutUsContent' | 'privacyPolicyContent' | 'termsContent' | 'refundPolicyContent'
  saveLabel: string
  successMessage: string
  errorMessage: string
}

function MarkdownEditor({ config, settings }: { config: MarkdownSectionConfig; settings: SiteSettings }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [content, setContent] = useState(settings[config.field] ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!accessToken) return
    setSaving(true)
    try {
      const res = await authFetch(config.endpoint, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error()
      toast({ variant: 'success', description: config.successMessage })
    } catch {
      toast({ variant: 'destructive', description: config.errorMessage })
    } finally {
      setSaving(false)
    }
  }

  return (
    <MarkdownContentForm label="Conteúdo" value={content} onChange={setContent} onSave={handleSave} saving={saving} saveLabel={config.saveLabel} />
  )
}

/** Página das seções de texto em markdown (sobre nós e as três políticas). */
export function SiteMarkdownSection({ config, backPath }: { config: MarkdownSectionConfig; backPath: string }) {
  return (
    <SiteSettingsSection slug={config.slug} backPath={backPath}>
      {(settings) => <MarkdownEditor config={config} settings={settings} />}
    </SiteSettingsSection>
  )
}
