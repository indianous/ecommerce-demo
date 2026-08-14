import type { Metadata } from 'next'
import { SolicitacoesContent } from '@/app/(employee)/dashboard/change-requests/SolicitacoesContent'

export const metadata: Metadata = { title: 'Solicitações' }

export default function AdminChangeRequestsPage() {
  return <SolicitacoesContent />
}
