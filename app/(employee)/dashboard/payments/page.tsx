import type { Metadata } from 'next'
import { PaymentsContent } from './PaymentsContent'

export const metadata: Metadata = { title: 'Pagamentos' }

export default function PagamentosPage() {
  return <PaymentsContent />
}
