import { Pagination } from '@indianous/base-ds'

interface PaginationBarProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function PaginationBar({ page, totalPages, onPageChange, className }: PaginationBarProps) {
  if (totalPages <= 1) return null
  return <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} className={className} />
}
