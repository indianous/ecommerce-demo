import { EmployeeFuncionarioDetailContent } from './EmployeeFuncionarioDetailContent'

export default async function EmployeeFuncionarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EmployeeFuncionarioDetailContent id={id} />
}
