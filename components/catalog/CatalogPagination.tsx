'use client'

import { useRouter } from 'next/navigation'
import { Pagination } from 'base-ds'

interface Props {
  currentPage: number
  totalPages: number
  categoryId: string | undefined
  search: string | undefined
}

export function CatalogPagination({ currentPage, totalPages, categoryId, search }: Props) {
  const router = useRouter()

  if (totalPages <= 1) return null

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams()
    if (categoryId) params.set('categoryId', categoryId)
    if (search) params.set('search', search)
    if (page > 1) params.set('page', String(page))
    router.push(`/catalog?${params.toString()}`)
  }

  return <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
}
