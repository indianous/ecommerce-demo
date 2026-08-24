import type { Metadata } from 'next'
import { SolicitacoesContent } from '@/components/content/SolicitacoesContent'

export const metadata: Metadata = { title: 'Solicitações' }

export default function AdminChangeRequestsPage() {
  return <SolicitacoesContent />
}
