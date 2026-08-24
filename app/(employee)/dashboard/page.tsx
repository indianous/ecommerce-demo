import type { Metadata } from 'next'
import { DashboardContent } from '@/components/content/DashboardContent'

export const metadata: Metadata = { title: 'Painel' }

export default function DashboardPage() {
  return <DashboardContent />
}
