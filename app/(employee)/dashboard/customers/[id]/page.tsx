import type { Metadata } from 'next'
import { CustomerDetailContent } from './CustomerDetailContent'

export const metadata: Metadata = { title: 'Detalhes do cliente' }

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CustomerDetailContent id={id} />
}
