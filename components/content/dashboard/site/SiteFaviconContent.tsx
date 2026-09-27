'use client'
import { useState } from 'react'
import { Image, useToast } from '@indianous/base-ds'
import { authFetch } from '@/lib/authFetch'
import { useAuthStore } from '@/stores/auth.store'
import { FaviconForm } from '@/components/forms/FaviconForm'
import { SiteSettingsSection } from './SiteSettingsSection'

function FaviconEditor({ initialUrl }: { initialUrl: string | null }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [faviconUrl, setFaviconUrl] = useState(initialUrl)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!file || !accessToken) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await authFetch('/api/site/settings/favicon', { method: 'PUT', body: fd })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: 'destructive', description: data?.message ?? 'Erro ao salvar favicon.' })
        return
      }
      setFaviconUrl(data.faviconUrl)
      setFile(null)
      toast({ variant: 'success', description: 'Favicon atualizado com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar favicon.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">Ícone exibido na aba do navegador.</p>
      {faviconUrl && <Image src={faviconUrl} alt="Favicon atual" className="h-8 w-8 rounded border" />}
      <FaviconForm file={file} onFileChange={setFile} onSave={handleSave} saving={saving} saveLabel="Salvar favicon" />
    </div>
  )
}

export function SiteFaviconContent({ backPath }: { backPath: string }) {
  return (
    <SiteSettingsSection slug="favicon" backPath={backPath}>
      {(settings) => <FaviconEditor initialUrl={settings.faviconUrl} />}
    </SiteSettingsSection>
  )
}
