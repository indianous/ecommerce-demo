import type { Metadata } from 'next'
import { ProductCreateContent } from './ProductCreateContent'

export const metadata: Metadata = { title: 'Novo produto' }

export default function NewProductPage() {
  return <ProductCreateContent />
}
