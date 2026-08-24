import { PaginationBar } from '@/components/ui/PaginationBar'

interface ManagementContentFooterProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function ManagementContentFooter({ page, totalPages, onPageChange }: ManagementContentFooterProps) {
  return <PaginationBar page={page} totalPages={totalPages} onPageChange={onPageChange} className="mt-4" />
}
