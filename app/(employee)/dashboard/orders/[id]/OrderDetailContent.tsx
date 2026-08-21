'use client'
import { useCallback, useEffect, useState } from 'react'
import type { ComponentProps } from 'react'
import Link from 'next/link'
import { Badge, Button, Heading, Icon, Select, Skeleton, Textarea, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import type { AdminOrderDetailResponse, Invoice, InvoiceStatus, OrderStatus, PaymentStatus } from '@/types'

type IconName = ComponentProps<typeof Icon>['name']

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  SHIPPED: 'Enviado',
  RETURNED: 'Devolvido',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

const ACTION_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmar',
  SHIPPED: 'Enviar',
  RETURNED: 'Devolver',
  DELIVERED: 'Entregar',
  CANCELLED: 'Cancelar',
}

const ACTION_ICONS: Record<OrderStatus, IconName> = {
  PENDING: 'Clock',
  CONFIRMED: 'Check',
  SHIPPED: 'Truck',
  RETURNED: 'RotateCcw',
  DELIVERED: 'PackageCheck',
  CANCELLED: 'X',
}

const STATUS_BADGE_VARIANT: Record<OrderStatus, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PENDING: 'warning',
  CONFIRMED: 'default',
  SHIPPED: 'secondary',
  RETURNED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  FAILED: 'Rejeitado',
  REFUNDED: 'Reembolsado',
}

const PAYMENT_STATUS_BADGE_VARIANT: Record<PaymentStatus, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'destructive',
  REFUNDED: 'secondary',
}

const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  PROCESSING: 'Processando',
  ISSUED: 'Emitida',
  ERROR: 'Erro',
  CANCELLED: 'Cancelada',
}

const INVOICE_STATUS_BADGE_VARIANT: Record<InvoiceStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  PROCESSING: 'warning',
  ISSUED: 'success',
  ERROR: 'danger',
  CANCELLED: 'default',
}

const NEXT_STATES: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  RETURNED: ['SHIPPED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

const ALL_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'RETURNED', 'DELIVERED', 'CANCELLED']
const TERMINAL_STATES: OrderStatus[] = ['DELIVERED', 'CANCELLED']

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))

export function OrderDetailContent({ id, backPath = '/dashboard/orders' }: { id: string; backPath?: string }) {
  const { accessToken, user } = useAuthStore()
  const { toast } = useToast()
  const [order, setOrder] = useState<AdminOrderDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [transitionTarget, setTransitionTarget] = useState<OrderStatus | null>(null)
  const [showRetroForm, setShowRetroForm] = useState(false)
  const [reason, setReason] = useState('')
  const [retroStatus, setRetroStatus] = useState<OrderStatus | ''>('')
  const [retroJustification, setRetroJustification] = useState('')
  const [saving, setSaving] = useState(false)
  const [issuingInvoice, setIssuingInvoice] = useState(false)

  const canManageInvoice = user?.role === 'ADMIN' || !!user?.permissions?.includes('MANAGE_PAYMENTS')

  const fetchOrder = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      setOrder(await res.json())
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao carregar pedido.' })
    } finally {
      setLoading(false)
    }
  }, [accessToken, id, toast])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order || !transitionTarget || !accessToken) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: transitionTarget, reason }),
      })
      if (!res.ok) throw new Error()
      setOrder(await res.json())
      setTransitionTarget(null)
      setReason('')
      toast({ variant: 'success', description: 'Status atualizado com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao atualizar status.' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order || !retroStatus || !accessToken) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/orders/${id}/change-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ toStatus: retroStatus, justification: retroJustification }),
      })
      if (!res.ok) throw new Error()
      setShowRetroForm(false)
      setRetroStatus('')
      setRetroJustification('')
      toast({ variant: 'success', description: 'Solicitação enviada com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao enviar solicitação.' })
    } finally {
      setSaving(false)
    }
  }

  const handleIssueInvoice = async () => {
    if (!accessToken) return
    setIssuingInvoice(true)
    try {
      const res = await fetch(`/api/admin/orders/${id}/invoice`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: 'destructive', description: data.message ?? 'Erro ao emitir a nota fiscal.' })
        return
      }
      setOrder((o) => (o ? { ...o, invoice: data as Invoice } : o))
      toast({ variant: 'success', description: 'Nota fiscal emitida com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao emitir a nota fiscal.' })
    } finally {
      setIssuingInvoice(false)
    }
  }

  if (loading) return <div role="status"><Skeleton variant="line" height={40} className="mb-2" /></div>
  if (!order) return <p>Pedido não encontrado.</p>

  const nextStates = NEXT_STATES[order.status]
  const isTerminal = TERMINAL_STATES.includes(order.status)
  const retroStates = ALL_STATUSES.filter((s) => s !== order.status && !nextStates.includes(s))

  return (
    <PermissionGuard permissions={['MANAGE_ORDERS', 'MANAGE_SHIPPING', 'MANAGE_ORDER_STATUS_REQUESTS']}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href={backPath}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Voltar
          </Link>
          <Heading as="h1" size="2xl">
            Pedido #{order.orderNumber}
          </Heading>
        </div>

        <div className="mb-6 flex flex-wrap gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Cliente</p>
            <p className="font-semibold">{order.customerName}</p>
            <p className="text-sm">{order.customerEmail}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={STATUS_BADGE_VARIANT[order.status]}>{STATUS_LABELS[order.status]}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="font-semibold">{formatBRL(order.totalAmount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pagamento</p>
            <p>{order.paymentMethod}</p>
            <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[order.paymentStatus]}>
              {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </Badge>
            {order.paymentStatus === 'FAILED' && order.paymentRejectionReason && (
              <p className="mt-1 text-sm text-muted-foreground">
                Motivo: {order.paymentRejectionReason}
              </p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2">Itens</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 border-b">Produto</th>
                <th className="text-left p-2 border-b">Qtd</th>
                <th className="text-left p-2 border-b">Preço unit.</th>
                <th className="text-left p-2 border-b">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.productId} className="border-b">
                  <td className="p-2">{item.productName}</td>
                  <td className="p-2">{item.quantity}</td>
                  <td className="p-2">{formatBRL(item.unitPrice)}</td>
                  <td className="p-2">{formatBRL(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2">Histórico de status</h2>
          <ul className="flex flex-col gap-2">
            {order.statusHistory.map((h) => (
              <li key={h.id} className="text-sm border-l-2 border-border pl-3">
                <span>{h.fromStatus ? STATUS_LABELS[h.fromStatus] : 'Criação'} → {STATUS_LABELS[h.toStatus]}</span>
                {h.reason && <span className="ml-2 text-muted-foreground">— {h.reason}</span>}
                <span className="ml-2 text-muted-foreground">{formatDate(h.createdAt)}</span>
                {h.changedByEmail && <span className="ml-2 text-muted-foreground">({h.changedByEmail})</span>}
              </li>
            ))}
          </ul>
        </div>

        {canManageInvoice && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-2">Nota fiscal</h2>
            {!order.invoice && (
              <div className="flex flex-col gap-2">
                <Button iconOnly leftIcon={<Icon name="FileText" size="sm" />} aria-label="Emitir NF-e" variant="primary" size="sm" disabled={order.paymentStatus !== 'PAID'} isLoading={issuingInvoice} onClick={handleIssueInvoice} />
                {order.paymentStatus !== 'PAID' && (
                  <p className="text-sm text-muted-foreground">
                    A nota fiscal só pode ser emitida após o pagamento ser aprovado.
                  </p>
                )}
              </div>
            )}

            {order.invoice && (
              <div className="flex flex-col gap-2">
                <Badge variant={INVOICE_STATUS_BADGE_VARIANT[order.invoice.status]}>
                  {INVOICE_STATUS_LABELS[order.invoice.status]}
                </Badge>

                {order.invoice.status === 'ISSUED' && order.invoice.danfeUrl && (
                  <>
                    <Button iconOnly leftIcon={<Icon name="FileText" size="sm" />} aria-label="Ver nota" as="a" href={order.invoice.danfeUrl} target="_blank" rel="noreferrer" size="sm" variant="outline" />
                    {order.invoice.accessKey && (
                      <p className="text-sm text-muted-foreground">
                        Chave de acesso: {order.invoice.accessKey}
                      </p>
                    )}
                  </>
                )}

                {order.invoice.status === 'PROCESSING' && (
                  <Button iconOnly leftIcon={<Icon name="RefreshCw" size="sm" />} aria-label="Atualizar status" size="sm" variant="outline" onClick={fetchOrder} />
                )}

                {order.invoice.status === 'ERROR' && (
                  <>
                    {order.invoice.errorMessage && (
                      <p className="text-sm text-muted-foreground">{order.invoice.errorMessage}</p>
                    )}
                    <Button iconOnly leftIcon={<Icon name="RotateCcw" size="sm" />} aria-label="Tentar novamente" variant="primary" size="sm" isLoading={issuingInvoice} onClick={handleIssueInvoice} />
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {nextStates.length > 0 && !transitionTarget && !showRetroForm && (
          <div className="mb-4 flex flex-wrap gap-2">
            {nextStates.map((s) => (
              <Button iconOnly leftIcon={<Icon name={ACTION_ICONS[s]} size="sm" />} aria-label={ACTION_LABELS[s]} key={s} variant="primary" size="sm" onClick={() => setTransitionTarget(s)} />
            ))}
          </div>
        )}

        {transitionTarget && (
          <form
            aria-label="Justificativa de mudança de status"
            onSubmit={handleStatusTransition}
            className="mb-4 flex flex-col gap-3 p-4 border rounded-md"
          >
            <p className="font-medium">
              Mudar para: <Badge variant={STATUS_BADGE_VARIANT[transitionTarget]}>{STATUS_LABELS[transitionTarget]}</Badge>
            </p>
            <label htmlFor="transition-reason" className="text-sm font-medium">Justificativa</label>
            <Textarea
              id="transition-reason"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="Descreva o motivo da mudança..."
            />
            <div className="flex gap-2">
              <Button iconOnly leftIcon={<Icon name="Check" size="sm" />} aria-label="Confirmar mudança" type="submit" variant="primary" isLoading={saving} />
              <Button iconOnly leftIcon={<Icon name="X" size="sm" />} aria-label="Cancelar" type="button" variant="secondary" onClick={() => { setTransitionTarget(null); setReason('') }} />
            </div>
          </form>
        )}

        {!isTerminal && !showRetroForm && !transitionTarget && (
          <Button iconOnly leftIcon={<Icon name="RotateCcw" size="sm" />} aria-label="Solicitar retrocesso" variant="outline" size="sm" onClick={() => setShowRetroForm(true)} />
        )}

        {showRetroForm && (
          <form
            aria-label="Formulário de solicitação retroativa"
            onSubmit={handleChangeRequest}
            className="mb-4 flex flex-col gap-3 p-4 border rounded-md"
          >
            <p className="font-medium">Solicitar retrocesso de status</p>
            <label htmlFor="retro-status" className="text-sm font-medium">Estado destino</label>
            <Select
              id="retro-status"
              value={retroStatus}
              onChange={(e) => setRetroStatus(e.target.value as OrderStatus)}
              required
              placeholder="Selecione..."
              options={retroStates.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
            />
            <label htmlFor="retro-justification" className="text-sm font-medium">Justificativa</label>
            <Textarea
              id="retro-justification"
              required
              value={retroJustification}
              onChange={(e) => setRetroJustification(e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="Descreva o motivo da solicitação..."
            />
            <div className="flex gap-2">
              <Button iconOnly leftIcon={<Icon name="Send" size="sm" />} aria-label="Enviar solicitação" type="submit" variant="primary" isLoading={saving} />
              <Button iconOnly leftIcon={<Icon name="X" size="sm" />} aria-label="Cancelar" type="button" variant="secondary" onClick={() => { setShowRetroForm(false); setRetroStatus(''); setRetroJustification('') }} />
            </div>
          </form>
        )}
      </div>
    </PermissionGuard>
  )
}
