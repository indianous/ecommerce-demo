import type { Metadata } from 'next'
import { ShippingContent } from './ShippingContent'

export const metadata: Metadata = { title: 'Envios' }

export default function ShippingPage() {
  return <ShippingContent />
}
