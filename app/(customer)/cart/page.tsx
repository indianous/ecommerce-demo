import type { Metadata } from 'next'
import { CartContent } from '@/components/content/CartContent'

export const metadata: Metadata = { title: 'Carrinho' }

export default function CartPage() {
  return <CartContent />
}
