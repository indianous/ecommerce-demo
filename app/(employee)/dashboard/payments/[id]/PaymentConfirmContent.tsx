'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heading, Skeleton, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { PaymentConfirmForm } from '@/components/forms/PaymentConfirmForm'
import type { AdminOrderDetailResponse } from '@/types'

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de Crédito',
  BOLETO: 'Boleto',
}

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
    fetch(`/api/admin/orders/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setOrder(data)
        setLoading(false)
      })
  }, [accessToken, id])

  const handleConfirm = async () => {
    if (!file || !accessToken) return
    setConfirming(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const uploadRes = await fetch('/api/upload/payment-receipt', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      })
      if (!uploadRes.ok) throw new Error('upload')
      const { url } = await uploadRes.json()

      const patchRes = await fetch(`/api/admin/orders/${id}/payment-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: 'PAID', receiptUrl: url }),
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
      <main className="mx-auto max-w-2xl px-4 py-8">
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
            <p className="font-semibold">{order.customerName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Método</p>
            <p>{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="font-semibold">{formatBRL(order.totalAmount)}</p>
          </div>
        </div>

        <PaymentConfirmForm
          file={file}
          onFileChange={setFile}
          onConfirm={handleConfirm}
          onCancel={() => router.push(backPath)}
          confirming={confirming}
        />
      </main>
    </PermissionGuard>
  )
}
