'use client'
import { SiteMarkdownSection } from './SiteMarkdownSection'

export function SiteTermsContent({ backPath }: { backPath: string }) {
  return (
    <SiteMarkdownSection
      backPath={backPath}
      config={{
        slug: 'terms', endpoint: '/api/site/settings/terms', field: 'termsContent',
        saveLabel: 'Salvar termos e condições',
        successMessage: 'Termos e condições atualizados com sucesso.', errorMessage: 'Erro ao salvar termos e condições.',
      }}
    />
  )
}
