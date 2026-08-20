'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heading, Skeleton, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { calculateAge } from '@/lib/age'
import type { CustomerDetailResponse, Gender } from '@/types'

const GENDER_LABELS: Record<Gender, string> = {
  FEMININO: 'Feminino',
  MASCULINO: 'Masculino',
  NAO_BINARIO: 'Não-binário',
  PREFIRO_NAO_DIZER: 'Prefiro não dizer',
}

function formatDate(value: string | null): string {
  if (!value) return 'Não informado'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

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

        <Heading as="h2" size="xl" className="mb-3">Dados pessoais</Heading>
        <dl className="mb-6 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Telefone</dt>
            <dd>{customer.phone ?? 'Não informado'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Data de nascimento</dt>
            <dd>{formatDate(customer.birthDate)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Idade</dt>
            <dd>{calculateAge(customer.birthDate) ?? 'Não informado'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Gênero</dt>
            <dd>{GENDER_LABELS[customer.gender]}</dd>
          </div>
        </dl>

        <Heading as="h2" size="xl" className="mb-3">Endereços</Heading>

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
