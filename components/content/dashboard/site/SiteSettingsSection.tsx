'use client'
import type { ReactNode } from 'react'
import { useSiteSettings } from '@/lib/useSiteSettings'
import { siteSectionTitle, type SiteSectionId } from '@/lib/site-sections'
import type { SiteSettings } from '@/types'
import { SiteSectionPage } from './SiteSectionPage'

interface Props {
  slug: SiteSectionId
  backPath: string
  /** Recebe as configurações já carregadas — o editor inicializa o estado a partir delas. */
  children: (settings: SiteSettings) => ReactNode
}

/** Página de seção que edita valores de `/api/site/settings`: carrega uma vez e entrega ao editor. */
export function SiteSettingsSection({ slug, backPath, children }: Props) {
  const { settings, loading } = useSiteSettings()

  return (
    <SiteSectionPage title={siteSectionTitle(slug)} backPath={backPath} loading={loading}>
      {settings ? (
        children(settings)
      ) : (
        <p className="text-sm text-muted-foreground">Não foi possível carregar as configurações do site.</p>
      )}
    </SiteSectionPage>
  )
}
