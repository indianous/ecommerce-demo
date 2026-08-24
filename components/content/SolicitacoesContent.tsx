'use client'

import { useCallback, useRef, useState } from 'react'
import { Badge, Button, Dialog, FilterDropdown, Heading, Icon, Table, type TableColumn, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { ManagementPageHeader } from '@/components/layout/ManagementPageHeader'
import { ManagementPageBody } from '@/components/layout/ManagementPageBody'
import { ManagementContentHeader } from '@/components/layout/ManagementContentHeader'
import { ManagementContentBody } from '@/components/layout/ManagementContentBody'
import { ManagementContentFooter } from '@/components/layout/ManagementContentFooter'
import { sortTableData } from '@/lib/sortTableData'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import type { OrderChangeRequest, OrderChangeRequestStatus, OrderStatus } from '@/types'

const STATUS_LABELS: Record<OrderChangeRequestStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
}

const STATUS_BADGE_VARIANT: Record<OrderChangeRequestStatus, 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
}

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  SHIPPED: 'Enviado',
  RETURNED: 'Devolvido',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

export function SolicitacoesContent() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()

  const searchRef = useRef('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [selected, setSelected] = useState<OrderChangeRequest | null>(null)
  const [actioning, setActioning] = useState(false)
  const [denyDialogOpen, setDenyDialogOpen] = useState(false)
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<OrderChangeRequest> | null> => {
    if (!accessToken) return null
    statusFilter.forEach((s) => params.append('status', s))
    if (searchRef.current) params.set('search', searchRef.current)
    try {
      const res = await fetch(`/api/admin/orders/change-requests?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      return await res.json()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao carregar solicitações.' })
      return null
    }
  }, [accessToken, statusFilter, toast])

  const { page, items: requests, setItems: setRequests, totalPages, loading, goToPage, reload } = usePaginatedFetch(fetchPage)

  const handleSearch = (value: string) => {
    searchRef.current = value
    reload()
  }

  const handleApprove = async () => {
    if (!selected) return
    setActioning(true)
    try {
      const res = await fetch(`/api/admin/orders/change-requests/${selected.id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      const updated: OrderChangeRequest = await res.json()
      setSelected(updated)
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      toast({ variant: 'success', description: 'Solicitação aprovada.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao aprovar solicitação.' })
    } finally {
      setActioning(false)
    }
  }

  const handleReject = async () => {
    if (!selected) return
    setActioning(true)
    try {
      const res = await fetch(`/api/admin/orders/change-requests/${selected.id}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      const updated: OrderChangeRequest = await res.json()
      setSelected(updated)
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      toast({ variant: 'success', description: 'Solicitação negada.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao negar solicitação.' })
    } finally {
      setActioning(false)
      setDenyDialogOpen(false)
    }
  }

  if (selected) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4">
          <Button iconOnly leftIcon={<Icon name="ArrowLeft" size="sm" />} aria-label="Voltar à lista" variant="outline" size="sm" onClick={() => setSelected(null)} />
        </div>

        <Heading as="h1" size="2xl" className="mb-6">
          Solicitação #{selected.orderNumber}
        </Heading>

        <div className="border rounded-lg p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold">Status:</span>
            <Badge variant={STATUS_BADGE_VARIANT[selected.status]}>
              {STATUS_LABELS[selected.status]}
            </Badge>
          </div>

          <div>
            <span className="font-semibold">Transição solicitada: </span>
            <span>
              {ORDER_STATUS_LABELS[selected.fromStatus]} → {ORDER_STATUS_LABELS[selected.toStatus]}
            </span>
          </div>

          <div>
            <span className="font-semibold">Solicitado por: </span>
            <span>{selected.requestedByEmail}</span>
          </div>

          <div>
            <span className="font-semibold">Justificativa:</span>
            <p className="mt-1 text-sm">{selected.justification}</p>
          </div>

          {selected.attachmentUrls.length > 0 && (
            <div>
              <span className="font-semibold">Anexos:</span>
              <ul className="mt-1 flex flex-col gap-1">
                {selected.attachmentUrls.map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selected.resolvedByEmail && (
            <div>
              <span className="font-semibold">Resolvido por: </span>
              <span>{selected.resolvedByEmail}</span>
            </div>
          )}

          {selected.status === 'PENDING' ? (
            <div className="flex gap-3 pt-2">
              <Button iconOnly leftIcon={<Icon name="Check" size="sm" />} aria-label="Aceitar" variant="primary" onClick={handleApprove} isLoading={actioning} />
              <Button iconOnly leftIcon={<Icon name="Ban" size="sm" />} aria-label="Negar" variant="danger" onClick={() => setDenyDialogOpen(true)} disabled={actioning} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Solicitação já resolvida — não pode ser alterada.
            </p>
          )}
        </div>

        <Dialog
          open={denyDialogOpen}
          onClose={() => setDenyDialogOpen(false)}
          title="Negar solicitação"
          description="Essa ação não pode ser desfeita."
          footer={
            <div className="flex gap-3">
              <Button iconOnly leftIcon={<Icon name="Ban" size="sm" />} aria-label="Confirmar" variant="danger" onClick={handleReject} isLoading={actioning} />
              <Button iconOnly leftIcon={<Icon name="X" size="sm" />} aria-label="Cancelar" variant="secondary" onClick={() => setDenyDialogOpen(false)} disabled={actioning} />
            </div>
          }
        />
      </main>
    )
  }

  const sortedRequests = sort ? sortTableData(requests, sort.key as keyof OrderChangeRequest, sort.direction, sort.key === 'orderNumber' ? 'number' : 'string') : requests

  const changeRequestColumns: TableColumn<OrderChangeRequest>[] = [
    { key: 'orderNumber', header: 'Pedido', sortable: true, render: (req) => `#${req.orderNumber}` },
    {
      key: 'transition',
      header: 'Transição',
      render: (req) => `${ORDER_STATUS_LABELS[req.fromStatus]} → ${ORDER_STATUS_LABELS[req.toStatus]}`,
    },
    { key: 'requestedByEmail', header: 'Solicitado por', render: (req) => req.requestedByEmail },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (req) => <Badge variant={STATUS_BADGE_VARIANT[req.status]}>{STATUS_LABELS[req.status]}</Badge>,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (req) => (
        <Button iconOnly leftIcon={<Icon name="Eye" size="sm" />} aria-label="Ver detalhe" variant="outline" size="sm" onClick={() => setSelected(req)} />
      ),
    },
  ]

  return (
    <PermissionGuard permissions={['MANAGE_ORDER_STATUS_REQUESTS']}>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <ManagementPageHeader title="Solicitações de Status" />
        <ManagementPageBody>
          <ManagementContentHeader
            searchId="change-requests-search"
            searchLabel="Buscar solicitações"
            searchPlaceholder="Buscar por número do pedido ou e-mail do solicitante..."
            onSearch={handleSearch}
            filters={
              <FilterDropdown
                label="Status"
                options={[
                  { value: 'PENDING', label: 'Pendente' },
                  { value: 'APPROVED', label: 'Aprovada' },
                  { value: 'REJECTED', label: 'Rejeitada' },
                ]}
                value={statusFilter}
                onApply={setStatusFilter}
              />
            }
          />

          <ManagementContentBody loading={loading} empty={requests.length === 0} emptyMessage="Nenhuma solicitação encontrada." loadingLabel="Carregando solicitações">
            <Table
              columns={changeRequestColumns}
              data={sortedRequests}
              onSort={(key, direction) => setSort({ key, direction })}
            />
          </ManagementContentBody>

          <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={goToPage} />
        </ManagementPageBody>
      </main>
    </PermissionGuard>
  )
}
