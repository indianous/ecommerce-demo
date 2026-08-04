import { PaymentConfirmContent } from '../PaymentConfirmContent'

export default async function PaymentConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PaymentConfirmContent id={id} />
}
