'use client'
import { useEffect, useState } from 'react'
import { Button, Icon, useToast } from 'base-ds'
import { authFetch } from '@/lib/authFetch'
import { siteSectionTitle } from '@/lib/site-sections'
import { useConfirmDelete } from '@/lib/useConfirmDelete'
import { useAuthStore } from '@/stores/auth.store'
import { BannerForm } from '@/components/forms/BannerForm'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import type { Banner } from '@/types'
import { SiteSectionPage } from './SiteSectionPage'

export function SiteBannersContent({ backPath }: { backPath: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [banners, setBanners] = useState<Banner[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/site/banners')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (Array.isArray(data)) setBanners(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!file || !accessToken) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (linkUrl) fd.append('linkUrl', linkUrl)
      const res = await authFetch('/api/site/banners', { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      const newBanner = await res.json()
      setBanners((prev) => [...prev, newBanner])
      setFile(null)
      setLinkUrl('')
      toast({ variant: 'success', description: 'Banner adicionado com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar banner.' })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id: string) => {
    if (!accessToken) return
    const res = await authFetch(`/api/site/banners/${id}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 204) {
      toast({ variant: 'destructive', description: 'Erro ao remover banner.' })
      throw new Error()
    }
    setBanners((prev) => prev.filter((b) => b.id !== id))
    toast({ variant: 'success', description: 'Banner removido.' })
  }

  const { target, setTarget, deleting, confirm, cancel } = useConfirmDelete(handleRemove)

  return (
    <SiteSectionPage title={siteSectionTitle('banners')} backPath={backPath} loading={loading}>
      <p className="mb-4 text-sm text-muted-foreground">Imagens de destaque exibidas na home.</p>

      {banners.length > 0 && (
        <ul className="mb-6 flex flex-col gap-2">
          {banners.map((banner) => (
            <li key={banner.id} className="flex items-center gap-3 rounded border p-2">
              <img src={banner.imageUrl} alt="Banner" className="h-10 w-16 rounded object-cover" />
              {banner.linkUrl && (
                <span className="flex-1 truncate text-sm text-muted-foreground">{banner.linkUrl}</span>
              )}
              <Button iconOnly leftIcon={<Icon name="Trash2" size="sm" />} aria-label="Remover" variant="danger" size="sm" onClick={() => setTarget(banner.id)} />
            </li>
          ))}
        </ul>
      )}

      <BannerForm
        file={file} linkUrl={linkUrl}
        onFileChange={setFile} onLinkUrl={setLinkUrl}
        onSave={handleSave} saving={saving}
        saveLabel="Adicionar banner"
      />

      <ConfirmDeleteDialog
        open={target !== null}
        onClose={cancel}
        onConfirm={confirm}
        deleting={deleting}
        title="Remover banner"
        description="Essa ação não pode ser desfeita."
      />
    </SiteSectionPage>
  )
}
