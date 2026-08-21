'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Dialog, Heading, Icon, Input, Skeleton, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import type { OrderChangeRequest, OrderChangeRequestStatus, OrderStatus } from '@/types'

const STATUS_LABELS: Record<OrderChangeRequestStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
}

const STATUS_BADGE_VARIANT: Record<OrderChangeRequestStatus, 'warning' | 'success' | 'destructive'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
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

  const [requests, setRequests] = useState<OrderChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderChangeRequestStatus | ''>('')
  const [selected, setSelected] = useState<OrderChangeRequest | null>(null)
  const [actioning, setActioning] = useState(false)
  const [denyDialogOpen, setDenyDialogOpen] = useState(false)

  const fetchRequests = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/orders/change-requests?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRequests(data.content ?? data)
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao carregar solicitações.' })
    } finally {
      setLoading(false)
    }
  }, [accessToken, search, statusFilter, toast])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

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

  return (
    <PermissionGuard permissions={['MANAGE_ORDER_STATUS_REQUESTS']}>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Heading as="h1" size="2xl" className="mb-6">
          Solicitações de Status
        </Heading>

        <div className="flex gap-3 mb-4 flex-wrap">
          <Input
            placeholder="Buscar por número do pedido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex gap-2">
            <Button
              variant={statusFilter === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('')}
            >
              Todas
            </Button>
            <Button
              variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('PENDING')}
            >
              Pendentes
            </Button>
            <Button
              variant={statusFilter === 'APPROVED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('APPROVED')}
            >
              Aprovadas
            </Button>
            <Button
              variant={statusFilter === 'REJECTED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('REJECTED')}
            >
              Rejeitadas
            </Button>
          </div>
        </div>

        {loading ? (
          <div role="status">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="line" height={40} className="mb-2" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma solicitação encontrada.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 border-b">Pedido</th>
                <th className="text-left p-2 border-b">Transição</th>
                <th className="text-left p-2 border-b">Solicitado por</th>
                <th className="text-left p-2 border-b">Status</th>
                <th className="text-left p-2 border-b">Ações</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b hover:bg-muted/50">
                  <td className="p-2">#{req.orderNumber}</td>
                  <td className="p-2">
                    {ORDER_STATUS_LABELS[req.fromStatus]} → {ORDER_STATUS_LABELS[req.toStatus]}
                  </td>
                  <td className="p-2">{req.requestedByEmail}</td>
                  <td className="p-2">
                    <Badge variant={STATUS_BADGE_VARIANT[req.status]}>
                      {STATUS_LABELS[req.status]}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <Button iconOnly leftIcon={<Icon name="Eye" size="sm" />} aria-label="Ver detalhe" variant="outline" size="sm" onClick={() => setSelected(req)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </PermissionGuard>
  )
}
