import type { Metadata } from 'next'
import { SolicitacoesContent } from '@/components/content/dashboard/sales/SolicitacoesContent'

export const metadata: Metadata = { title: 'Solicitações' }

export default function AdminChangeRequestsPage() {
  return <SolicitacoesContent />
}
