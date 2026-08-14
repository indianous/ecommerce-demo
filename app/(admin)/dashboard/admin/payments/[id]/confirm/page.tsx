import type { Metadata } from 'next'
import { PaymentConfirmContent } from '@/app/(employee)/dashboard/payments/[id]/PaymentConfirmContent'

export const metadata: Metadata = { title: 'Confirmar pagamento' }

export default async function AdminPaymentConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PaymentConfirmContent id={id} backPath="/dashboard/admin/payments" />
}
