'use client'
import { SiteMarkdownSection } from './SiteMarkdownSection'

export function SiteRefundPolicyContent({ backPath }: { backPath: string }) {
  return (
    <SiteMarkdownSection
      backPath={backPath}
      config={{
        slug: 'refund-policy', endpoint: '/api/site/settings/refund-policy', field: 'refundPolicyContent',
        saveLabel: 'Salvar política de reembolso',
        successMessage: 'Política de reembolso atualizada com sucesso.', errorMessage: 'Erro ao salvar política de reembolso.',
      }}
    />
  )
}
