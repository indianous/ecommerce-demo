'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Heading, Icon, SearchField, Skeleton, Table, type TableColumn, Text, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { CopyButton } from '@/components/ui/CopyButton'
import { sortTableData } from '@/lib/sortTableData'
import type { CustomerResponse } from '@/types'

export function CustomersContent({ basePath = '/dashboard/customers' }: { basePath?: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchCustomers = useCallback(
    async (q: string) => {
      if (!accessToken) return
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (q) params.set('search', q)
        const res = await fetch(`/api/admin/customers?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        setCustomers(data.content ?? data)
      } catch {
        toast({ variant: 'destructive', description: 'Erro ao carregar clientes.' })
      } finally {
        setLoading(false)
      }
    },
    [accessToken, toast],
  )

  useEffect(() => {
    fetchCustomers('')
  }, [fetchCustomers])

  const sortedCustomers = sort ? sortTableData(customers, sort.key as keyof CustomerResponse, sort.direction, 'string') : customers

  const columns: TableColumn<CustomerResponse>[] = [
    {
      key: 'name',
      header: 'Nome',
      sortable: true,
      render: (c) => (
        <span className="inline-flex items-center gap-2">
          {c.name}
          <CopyButton value={c.name} label="nome" />
        </span>
      ),
    },
    {
      key: 'email',
      header: 'E-mail',
      render: (c) => (
        <span className="inline-flex items-center gap-2">
          {c.email}
          <CopyButton value={c.email} label="e-mail" />
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (c) => (
        <Button
          iconOnly
          leftIcon={<Icon name="Eye" size="sm" />}
          aria-label="Ver detalhe"
          size="sm"
          variant="outline"
          onClick={() => router.push(`${basePath}/${c.id}`)}
        />
      ),
    },
  ]

  return (
    <PermissionGuard permissions={['MANAGE_CUSTOMERS']}>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Heading as="h1" size="2xl" className="mb-6">
          Gestão de Clientes
        </Heading>

        <SearchField
          id="customers-search"
          label="Buscar clientes"
          placeholder="Buscar por nome ou email..."
          buttonLabel="Buscar"
          buttonIconOnly
          onSearch={fetchCustomers}
          className="mb-4"
        />

        {loading ? (
          <div role="status">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="line" height={40} className="mb-2" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <Text size="sm" color="muted">Nenhum cliente encontrado.</Text>
        ) : (
          <Table
            columns={columns}
            data={sortedCustomers}
            onSort={(key, direction) => setSort({ key, direction })}
          />
        )}
      </main>
    </PermissionGuard>
  )
}
