import type { Metadata } from 'next'
import { PaymentConfirmContent } from '@/components/content/dashboard/sales/PaymentConfirmContent'

export const metadata: Metadata = { title: 'Confirmar pagamento' }

export default async function PaymentConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PaymentConfirmContent id={id} />
}
