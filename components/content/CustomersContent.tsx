'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Icon, Table, type TableColumn, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { CopyButton } from '@/components/ui/CopyButton'
import { ManagementPageHeader } from '@/components/layout/ManagementPageHeader'
import { ManagementPageBody } from '@/components/layout/ManagementPageBody'
import { ManagementContentHeader } from '@/components/layout/ManagementContentHeader'
import { ManagementContentBody } from '@/components/layout/ManagementContentBody'
import { ManagementContentFooter } from '@/components/layout/ManagementContentFooter'
import { SelectionBar } from '@/components/layout/SelectionBar'
import { makeSelectionColumn } from '@/components/layout/selectionColumn'
import { sortTableData } from '@/lib/sortTableData'
import { useRowSelection } from '@/lib/useRowSelection'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import type { CustomerResponse } from '@/types'

export function CustomersContent({ basePath = '/dashboard/customers' }: { basePath?: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()
  const searchRef = useRef('')
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<CustomerResponse> | null> => {
    if (!accessToken) return null
    if (searchRef.current) params.set('search', searchRef.current)
    try {
      const res = await fetch(`/api/admin/customers?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      return await res.json()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao carregar clientes.' })
      return null
    }
  }, [accessToken, toast])

  const { page, items: customers, totalPages, loading, goToPage, reload } = usePaginatedFetch(fetchPage)

  const handleSearch = (value: string) => {
    searchRef.current = value
    reload()
  }

  const sortedCustomers = sort ? sortTableData(customers, sort.key as keyof CustomerResponse, sort.direction, 'string') : customers

  const selection = useRowSelection()

  const columns: TableColumn<CustomerResponse>[] = [
    makeSelectionColumn(sortedCustomers, (c) => c.id, (c) => c.name, selection.selectedIds, selection.toggle, selection.selectAll),
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
        <ManagementPageHeader title="Gestão de Clientes" />
        <ManagementPageBody>
          <ManagementContentHeader
            searchId="customers-search"
            searchLabel="Buscar clientes"
            searchPlaceholder="Buscar por nome, e-mail, telefone ou id..."
            onSearch={handleSearch}
          />

          <SelectionBar selectedCount={selection.selectedCount} onClear={selection.clear} />

          <ManagementContentBody loading={loading} empty={customers.length === 0} emptyMessage="Nenhum cliente encontrado." loadingLabel="Carregando clientes">
            <Table
              columns={columns}
              data={sortedCustomers}
              onSort={(key, direction) => setSort({ key, direction })}
            />
          </ManagementContentBody>

          <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={(p) => { goToPage(p); selection.clear() }} />
        </ManagementPageBody>
      </main>
    </PermissionGuard>
  )
}
