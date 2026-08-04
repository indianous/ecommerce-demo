'use client'

import { useEffect, useState } from 'react'
import { Button, FileUpload, FormField, Heading, Image, Skeleton, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'

export function SiteContent() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()

  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/site/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setCurrentUrl(data?.placeholderImageUrl ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!file || !accessToken) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/site/settings/placeholder-image', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCurrentUrl(data.placeholderImageUrl)
      setFile(null)
      toast({ variant: 'success', description: 'Placeholder atualizado com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar placeholder.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <PermissionGuard permissions={['MANAGE_SITE']}>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Heading as="h1" size="2xl" className="mb-6">
          Gestão do Site
        </Heading>

        {loading ? (
          <div role="status">
            <Skeleton variant="line" height={40} className="mb-4" />
            <Skeleton variant="line" height={120} />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <section>
              <Heading as="h2" size="lg" className="mb-3">
                Imagem placeholder de produto
              </Heading>

              {currentUrl && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Placeholder atual:</p>
                  <Image
                    src={currentUrl}
                    alt="Placeholder atual"
                    aspectRatio="landscape"
                    objectFit="contain"
                    className="max-w-xs rounded border"
                  />
                </div>
              )}

              <FormField label="Nova imagem de placeholder" id="placeholder-upload">
                <FileUpload
                  accept="image/jpeg,image/png,image/webp"
                  onChange={([f]) => setFile(f ?? null)}
                />
              </FormField>

              {file && (
                <p className="text-sm text-muted-foreground mt-2">
                  Arquivo selecionado: <span className="font-medium">{file.name}</span>
                </p>
              )}

              <div className="mt-4">
                <Button
                  onClick={handleSave}
                  disabled={!file || saving}
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </section>
          </div>
        )}
      </main>
    </PermissionGuard>
  )
}
