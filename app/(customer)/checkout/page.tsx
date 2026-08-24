import type { Metadata } from 'next'
import { CheckoutContent } from '@/components/content/CheckoutContent'

export const metadata: Metadata = { title: 'Finalizar pedido' }

export default function CheckoutPage() {
  return <CheckoutContent />
}
