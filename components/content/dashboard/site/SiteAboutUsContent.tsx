'use client'
import { SiteMarkdownSection } from './SiteMarkdownSection'

export function SiteAboutUsContent({ backPath }: { backPath: string }) {
  return (
    <SiteMarkdownSection
      backPath={backPath}
      config={{
        slug: 'about-us', endpoint: '/api/site/settings/about-us', field: 'aboutUsContent',
        saveLabel: 'Salvar sobre nós',
        successMessage: 'Sobre nós atualizado com sucesso.', errorMessage: 'Erro ao salvar sobre nós.',
      }}
    />
  )
}
