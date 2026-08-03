'use client'
import { Heading } from 'base-ds'
import { PermissionGuard } from '@/components/employee/PermissionGuard'

export default function PagamentosPage() {
  return (
    <PermissionGuard permissions={['MANAGE_PAYMENTS']}>
      <Heading as="h1" size="2xl" className="mb-6">
        Gestão de Pagamentos
      </Heading>
    </PermissionGuard>
  )
}
