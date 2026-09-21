'use client'
import { SiteMarkdownSection } from './SiteMarkdownSection'

export function SitePrivacyPolicyContent({ backPath }: { backPath: string }) {
  return (
    <SiteMarkdownSection
      backPath={backPath}
      config={{
        slug: 'privacy-policy', endpoint: '/api/site/settings/privacy-policy', field: 'privacyPolicyContent',
        saveLabel: 'Salvar política de privacidade',
        successMessage: 'Política de privacidade atualizada com sucesso.', errorMessage: 'Erro ao salvar política de privacidade.',
      }}
    />
  )
}
