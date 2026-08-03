'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heading, Skeleton, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import type { CustomerDetailResponse } from '@/types'

export function CustomerDetailContent({ id, backPath = '/dashboard/customers' }: { id: string; backPath?: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [customer, setCustomer] = useState<CustomerDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return
    fetch(`/api/admin/customers/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setCustomer(data)
        setLoading(false)
      })
      .catch(() => {
        toast({ variant: 'destructive', description: 'Erro ao carregar cliente.' })
        setLoading(false)
      })
  }, [accessToken, id, toast])

  if (loading) {
    return (
      <div role="status">
        <Skeleton variant="line" height={40} className="mb-2" />
        <Skeleton variant="line" height={40} className="mb-2" />
      </div>
    )
  }

  if (!customer) return <p>Cliente não encontrado.</p>

  return (
    <PermissionGuard permissions={['MANAGE_CUSTOMERS']}>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href={backPath} className="text-sm text-muted-foreground hover:underline">
            ← Voltar
          </Link>
          <Heading as="h1" size="2xl">{customer.name}</Heading>
        </div>

        <p className="text-sm text-muted-foreground mb-6">{customer.email}</p>

        <Heading as="h2" size="lg" className="mb-3">Endereços</Heading>

        {customer.addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {customer.addresses.map((a) => (
              <li key={a.id} className="border rounded p-3 text-sm">
                <p>
                  {a.street}, {a.number}
                  {a.complement ? `, ${a.complement}` : ''}
                </p>
                <p>
                  {a.district} — {a.city}/{a.state}
                </p>
                <p>CEP: {a.zipCode}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </PermissionGuard>
  )
}
