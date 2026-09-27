'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Container, Heading, Skeleton, useToast } from '@indianous/base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { OrderTotal } from '@/components/order/OrderTotal'
import { CopyButton } from '@/components/ui/CopyButton'
import { PaymentConfirmForm } from '@/components/forms/PaymentConfirmForm'
import { paymentMethodLabel, paymentProviderLabel } from '@/lib/payment-labels'
import type { AdminOrderDetailResponse } from '@/types'

export function PaymentConfirmContent({
  id,
  backPath = '/dashboard/payments',
}: {
  id: string
  backPath?: string
}) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()

  const [order, setOrder] = useState<AdminOrderDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    authFetch(`/api/admin/orders/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setOrder(data)
        setLoading(false)
      })
  }, [accessToken, id])

  // Na retirada a equipe recebe no balcão: o comprovante é opcional
  const receiptRequired = order?.paymentMethod !== 'PAY_ON_PICKUP'

  const handleConfirm = async () => {
    if ((receiptRequired && !file) || !accessToken) return
    setConfirming(true)
    try {
      let receiptUrl: string | undefined
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        const uploadRes = await authFetch('/api/upload/payment-receipt', {
          method: 'POST',
          body: fd,
        })
        if (!uploadRes.ok) throw new Error('upload')
        receiptUrl = (await uploadRes.json()).url
      }

      const patchRes = await authFetch(`/api/admin/orders/${id}/payment-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ status: 'PAID', ...(receiptUrl ? { receiptUrl } : {}) }),
      })
      if (!patchRes.ok) throw new Error('patch')

      toast({ variant: 'success', description: 'Pagamento confirmado com sucesso.' })
      router.push(backPath)
    } catch (err) {
      if (err instanceof Error && err.message === 'upload') {
        toast({ variant: 'destructive', description: 'Erro ao enviar comprovante.' })
      } else {
        toast({ variant: 'destructive', description: 'Erro ao confirmar pagamento.' })
      }
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div role="status">
        <Skeleton variant="line" height={40} className="mb-2" />
        <Skeleton variant="line" height={40} className="mb-2" />
      </div>
    )
  }

  if (!order) return <p>Pedido não encontrado.</p>

  return (
    <PermissionGuard permissions={['MANAGE_PAYMENTS']}>
      <Container>
        <div className="mb-6 flex items-center gap-4">
          <Link href={backPath} className="text-sm text-muted-foreground hover:underline">
            ← Voltar
          </Link>
          <Heading as="h1" size="2xl">Confirmar Pagamento</Heading>
        </div>

        <div className="mb-8 border rounded-lg p-4 flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-muted-foreground">Pedido</p>
            <p className="font-semibold">#{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Cliente</p>
            <p className="font-semibold inline-flex items-center gap-2">
              {order.customerName}
              <CopyButton value={order.customerName} label="nome do cliente" />
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Método</p>
            <p>{paymentMethodLabel(order.paymentMethod)}</p>
          </div>
          {paymentProviderLabel(order.paymentProvider) && (
            <div>
              <p className="text-muted-foreground">Origem</p>
              <p>{paymentProviderLabel(order.paymentProvider)}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Total</p>
            <OrderTotal totalAmount={order.totalAmount} discountAmount={order.discountAmount} couponCode={order.couponCode} />
          </div>
        </div>

        <PaymentConfirmForm
          file={file}
          onFileChange={setFile}
          onConfirm={handleConfirm}
          onCancel={() => router.push(backPath)}
          confirming={confirming}
          receiptRequired={receiptRequired}
        />
      </Container>
    </PermissionGuard>
  )
}
