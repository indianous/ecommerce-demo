'use client'
import { useState } from 'react'
import { useToast } from 'base-ds'
import { authFetch } from '@/lib/authFetch'
import { useAuthStore } from '@/stores/auth.store'
import { LogoForm } from '@/components/forms/LogoForm'
import { SiteSettingsSection } from './SiteSettingsSection'

function LogoEditor({ initialUrl }: { initialUrl: string | null }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [logoUrl, setLogoUrl] = useState(initialUrl)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!file || !accessToken) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await authFetch('/api/site/settings/logo', { method: 'PUT', body: fd })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLogoUrl(data.logoUrl)
      setFile(null)
      toast({ variant: 'success', description: 'Logo atualizado com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar logo.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">SVG utilizado como logotipo da loja.</p>
      {logoUrl && <img src={logoUrl} alt="Logo atual" className="h-10 self-start rounded border object-contain" />}
      <LogoForm file={file} onFileChange={setFile} onSave={handleSave} saving={saving} saveLabel="Salvar logo" />
    </div>
  )
}

export function SiteLogoContent({ backPath }: { backPath: string }) {
  return (
    <SiteSettingsSection slug="logo" backPath={backPath}>
      {(settings) => <LogoEditor initialUrl={settings.logoUrl} />}
    </SiteSettingsSection>
  )
}
