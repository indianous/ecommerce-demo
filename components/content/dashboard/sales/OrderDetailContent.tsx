'use client'
import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import type { ComponentProps } from 'react'
import Link from 'next/link'
import { Badge, Button, Container, Heading, Icon, Select, Skeleton, Table, type TableColumn, Text, Textarea, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { OrderTotal } from '@/components/order/OrderTotal'
import { CopyButton } from '@/components/ui/CopyButton'
import { paymentMethodLabel } from '@/lib/payment-labels'
import type { AdminOrderDetailResponse, Invoice, InvoiceStatus, OrderItemResponse, OrderStatus, PaymentStatus } from '@/types'

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

const STATUS_BADGE_VARIANT: Record<OrderStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  CONFIRMED: 'default',
  SHIPPED: 'default',
  RETURNED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'danger',
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  FAILED: 'Rejeitado',
  REFUNDED: 'Reembolsado',
}

const PAYMENT_STATUS_BADGE_VARIANT: Record<PaymentStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'default',
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
  const [buyingLabel, setBuyingLabel] = useState(false)

  const canManageInvoice = user?.role === 'ADMIN' || !!user?.permissions?.includes('MANAGE_PAYMENTS')
  const canManageShipping = user?.role === 'ADMIN' || !!user?.permissions?.includes('MANAGE_SHIPPING')

  const fetchOrder = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await authFetch(`/api/admin/orders/${id}`)
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
      const res = await authFetch(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', },
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
      const res = await authFetch(`/api/admin/orders/${id}/change-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
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

  const handleBuyShippingLabel = async () => {
    if (!accessToken) return
    setBuyingLabel(true)
    try {
      const res = await authFetch(`/api/admin/orders/${id}/shipping-label`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: 'destructive', description: data.message ?? 'Erro ao comprar etiqueta.' })
        return
      }
      setOrder((o) => (o ? { ...o, trackingCode: data.trackingCode, shippingLabelUrl: data.shippingLabelUrl } : o))
      toast({ variant: 'success', description: 'Etiqueta comprada com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao comprar etiqueta.' })
    } finally {
      setBuyingLabel(false)
    }
  }

  const handleIssueInvoice = async () => {
    if (!accessToken) return
    setIssuingInvoice(true)
    try {
      const res = await authFetch(`/api/admin/orders/${id}/invoice`, {
        method: 'POST',
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

  const itemColumns: TableColumn<OrderItemResponse>[] = [
    { key: 'productName', header: 'Produto', render: (item) => item.productName },
    { key: 'quantity', header: 'Qtd', render: (item) => item.quantity },
    { key: 'unitPrice', header: 'Preço unit.', render: (item) => formatBRL(item.unitPrice) },
    { key: 'subtotal', header: 'Subtotal', render: (item) => formatBRL(item.subtotal) },
  ]

  return (
    <PermissionGuard permissions={['MANAGE_ORDERS', 'MANAGE_SHIPPING', 'MANAGE_ORDER_STATUS_REQUESTS']}>
      <Container>
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
            <p className="font-semibold inline-flex items-center gap-2">
              {order.customerName}
              <CopyButton value={order.customerName} label="nome do cliente" />
            </p>
            <p className="text-sm inline-flex items-center gap-2">
              {order.customerEmail}
              <CopyButton value={order.customerEmail} label="e-mail do cliente" />
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={STATUS_BADGE_VARIANT[order.status]}>{STATUS_LABELS[order.status]}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <OrderTotal totalAmount={order.totalAmount} discountAmount={order.discountAmount} couponCode={order.couponCode} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pagamento</p>
            <p>{paymentMethodLabel(order.paymentMethod)}</p>
            <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[order.paymentStatus]}>
              {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </Badge>
            {order.paymentStatus === 'FAILED' && order.paymentRejectionReason && (
              <p className="mt-1 text-sm text-muted-foreground">
                Motivo: {order.paymentRejectionReason}
              </p>
            )}
            {order.paymentStatus === 'PENDING' && order.paymentCheckoutUrl && (
              <p className="mt-1 inline-flex flex-wrap items-center gap-2 break-all text-sm">
                {order.paymentCheckoutUrl}
                <CopyButton value={order.paymentCheckoutUrl} label="link de pagamento" />
              </p>
            )}
          </div>
        </div>

        {order.origin === 'STAFF' && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              Criado pela equipe{order.createdByName ? `: ${order.createdByName}` : ''}
            </p>
            {order.notes && <p className="text-sm whitespace-pre-line">{order.notes}</p>}
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2">Itens</h2>
          {order.items.length === 0 ? (
            <Text size="sm" color="muted">Nenhum item neste pedido.</Text>
          ) : (
            <Table columns={itemColumns} data={order.items} />
          )}
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

        {canManageShipping && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-2">Frete</h2>
            {order.deliveryMethod === 'PICKUP' ? (
              <p className="text-sm text-muted-foreground">
                Retirada em: {order.pickupLocation?.name}
                {order.pickupLocation && ` — ${order.pickupLocation.street}, ${order.pickupLocation.number} — ${order.pickupLocation.district}, ${order.pickupLocation.city}/${order.pickupLocation.state}`}
              </p>
            ) : (
              <>
                {(order.shippingCarrierName || order.shippingCost !== undefined) && (
                  <p className="text-sm text-muted-foreground">
                    {order.shippingCarrierName && `${order.shippingCarrierName} — ${order.shippingServiceName} — `}
                    {order.shippingCost !== undefined && formatBRL(order.shippingCost)}
                  </p>
                )}
                {!order.trackingCode && (
                  <Button leftIcon={<Icon name="Package" size="sm" />} variant="primary" size="sm" isLoading={buyingLabel} onClick={handleBuyShippingLabel}>Comprar etiqueta</Button>
                )}
                {order.trackingCode && (
                  <div className="flex flex-col gap-1">
                    <p className="text-sm">Código de rastreio: {order.trackingCode}</p>
                    {order.shippingLabelUrl && (
                      <Button leftIcon={<Icon name="FileText" size="sm" />} as="a" href={order.shippingLabelUrl} target="_blank" rel="noreferrer" size="sm" variant="outline">Ver etiqueta</Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {canManageInvoice && process.env.NEXT_PUBLIC_FISCAL_INVOICE_EMISSION_ENABLED !== 'false' && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-2">Nota fiscal</h2>
            {!order.invoice && (
              <div className="flex flex-col gap-2">
                <Button leftIcon={<Icon name="FileText" size="sm" />} variant="primary" size="sm" disabled={order.paymentStatus !== 'PAID'} isLoading={issuingInvoice} onClick={handleIssueInvoice}>Emitir NF-e</Button>
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
                    <Button leftIcon={<Icon name="FileText" size="sm" />} as="a" href={order.invoice.danfeUrl} target="_blank" rel="noreferrer" size="sm" variant="outline">Ver nota</Button>
                    {order.invoice.accessKey && (
                      <p className="text-sm text-muted-foreground">
                        Chave de acesso: {order.invoice.accessKey}
                      </p>
                    )}
                  </>
                )}

                {order.invoice.status === 'PROCESSING' && (
                  <Button leftIcon={<Icon name="RefreshCw" size="sm" />} size="sm" variant="outline" onClick={fetchOrder}>Atualizar status</Button>
                )}

                {order.invoice.status === 'ERROR' && (
                  <>
                    {order.invoice.errorMessage && (
                      <p className="text-sm text-muted-foreground">{order.invoice.errorMessage}</p>
                    )}
                    <Button leftIcon={<Icon name="RotateCcw" size="sm" />} variant="primary" size="sm" isLoading={issuingInvoice} onClick={handleIssueInvoice}>Tentar novamente</Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {nextStates.length > 0 && !transitionTarget && !showRetroForm && (
          <div className="mb-4 flex flex-wrap gap-2">
            {nextStates.map((s) => (
              <Button leftIcon={<Icon name={ACTION_ICONS[s]} size="sm" />} key={s} variant="primary" size="sm" onClick={() => setTransitionTarget(s)}>{ACTION_LABELS[s]}</Button>
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
              <Button leftIcon={<Icon name="Check" size="sm" />} type="submit" variant="primary" isLoading={saving}>Confirmar mudança</Button>
              <Button leftIcon={<Icon name="X" size="sm" />} type="button" variant="secondary" onClick={() => { setTransitionTarget(null); setReason('') }}>Cancelar</Button>
            </div>
          </form>
        )}

        {!isTerminal && !showRetroForm && !transitionTarget && (
          <Button leftIcon={<Icon name="RotateCcw" size="sm" />} variant="outline" size="sm" onClick={() => setShowRetroForm(true)}>Solicitar retrocesso</Button>
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
              <Button leftIcon={<Icon name="Send" size="sm" />} type="submit" variant="primary" isLoading={saving}>Enviar solicitação</Button>
              <Button leftIcon={<Icon name="X" size="sm" />} type="button" variant="secondary" onClick={() => { setShowRetroForm(false); setRetroStatus(''); setRetroJustification('') }}>Cancelar</Button>
            </div>
          </form>
        )}
      </Container>
    </PermissionGuard>
  )
}
