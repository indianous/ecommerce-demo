'use client'
import { useState } from 'react'
import { Image, useToast } from 'base-ds'
import { authFetch } from '@/lib/authFetch'
import { useAuthStore } from '@/stores/auth.store'
import { PlaceholderImageForm } from '@/components/forms/PlaceholderImageForm'
import { SiteSettingsSection } from './SiteSettingsSection'

function PlaceholderEditor({ initialUrl }: { initialUrl: string | null }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [placeholderUrl, setPlaceholderUrl] = useState(initialUrl)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!file || !accessToken) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await authFetch('/api/site/settings/placeholder-image', { method: 'PUT', body: fd })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPlaceholderUrl(data.placeholderImageUrl)
      setFile(null)
      toast({ variant: 'success', description: 'Placeholder atualizado com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar placeholder.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">Imagem exibida quando um produto não tem foto.</p>
      {placeholderUrl && (
        <Image src={placeholderUrl} alt="Placeholder atual" aspectRatio="video" objectFit="contain" className="max-w-[120px] rounded border" />
      )}
      <PlaceholderImageForm file={file} onFileChange={setFile} onSave={handleSave} saving={saving} saveLabel="Salvar placeholder" />
    </div>
  )
}

export function SitePlaceholderContent({ backPath }: { backPath: string }) {
  return (
    <SiteSettingsSection slug="placeholder-image" backPath={backPath}>
      {(settings) => <PlaceholderEditor initialUrl={settings.placeholderImageUrl} />}
    </SiteSettingsSection>
  )
}
