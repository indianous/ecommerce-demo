'use client'

import { Alert, Button, Icon } from '@indianous/base-ds'
import { homeFor } from '@/lib/route-access'
import { useAuthStore } from '@/stores/auth.store'

/** Para admin e funcionário na loja: avisa que é a visão do cliente e leva de volta ao painel. */
export function StaffPreviewBanner() {
  const role = useAuthStore((s) => s.role)

  if (role !== 'ADMIN' && role !== 'EMPLOYEE') return null

  return (
    <Alert
      variant="neutral"
      layout="full"
      icon={<Icon name="Eye" size="md" />}
      role="region"
      aria-label="Visão do cliente"
      actions={
        <Button as="a" href={homeFor(role)} variant="outline" size="sm" leftIcon={<Icon name="ArrowLeft" size="sm" />}>
          Voltar ao painel
        </Button>
      }
    >
      Você está vendo a loja como um cliente
    </Alert>
  )
}
