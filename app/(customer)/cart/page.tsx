import type { Metadata } from 'next'
import { CartContent } from '@/components/content/store/CartContent'

export const metadata: Metadata = { title: 'Carrinho' }

export default function CartPage() {
  return <CartContent />
}
