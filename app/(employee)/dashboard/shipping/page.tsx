import type { Metadata } from 'next'
import { ShippingContent } from '@/components/content/dashboard/sales/ShippingContent'

export const metadata: Metadata = { title: 'Envios' }

export default function ShippingPage() {
  return <ShippingContent />
}
