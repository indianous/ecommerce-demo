import type { Metadata } from 'next'
import { SolicitacoesContent } from './SolicitacoesContent'

export const metadata: Metadata = { title: 'Solicitações' }

export default function SolicitacoesPage() {
  return <SolicitacoesContent />
}
