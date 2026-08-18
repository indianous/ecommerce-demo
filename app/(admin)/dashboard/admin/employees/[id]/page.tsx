import type { Metadata } from 'next'
import { EmployeeDetailPage } from './EmployeeDetailContent'

export const metadata: Metadata = { title: 'Detalhes do funcionário' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EmployeeDetailPage id={id} />
}
