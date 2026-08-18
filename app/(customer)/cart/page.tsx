import type { Metadata } from 'next'
import { CartContent } from './CartContent'

export const metadata: Metadata = { title: 'Carrinho' }

export default function CartPage() {
  return <CartContent />
}
