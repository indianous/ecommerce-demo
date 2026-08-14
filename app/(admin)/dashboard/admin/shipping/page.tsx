import type { Metadata } from 'next'
import { ShippingContent } from '@/app/(employee)/dashboard/shipping/ShippingContent'

export const metadata: Metadata = { title: 'Envios' }

export default function AdminShippingPage() {
  return <ShippingContent orderBasePath="/dashboard/admin/orders" />
}
