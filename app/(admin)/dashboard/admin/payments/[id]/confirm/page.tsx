import { PaymentConfirmContent } from '@/app/(employee)/dashboard/payments/[id]/PaymentConfirmContent'

export default async function AdminPaymentConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PaymentConfirmContent id={id} backPath="/dashboard/admin/payments" />
}
