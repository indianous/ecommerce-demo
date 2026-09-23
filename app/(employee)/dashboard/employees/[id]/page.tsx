import type { Metadata } from 'next'
import { EmployeeFuncionarioDetailContent } from '@/components/content/dashboard/people/EmployeeFuncionarioDetailContent'

export const metadata: Metadata = { title: 'Detalhes do funcionário' }

export default async function EmployeeFuncionarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EmployeeFuncionarioDetailContent id={id} />
}
