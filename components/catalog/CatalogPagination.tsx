'use client'

import { useRouter } from 'next/navigation'
import { Pagination } from '@indianous/base-ds'
import { buildCatalogUrl } from './catalogUrl'
import type { ProductSort } from '@/types'

interface Props {
  currentPage: number
  totalPages: number
  category: string | undefined
  search: string | undefined
  sort?: ProductSort
  onSale?: boolean
}

export function CatalogPagination({ currentPage, totalPages, category, search, sort, onSale }: Props) {
  const router = useRouter()

  if (totalPages <= 1) return null

  const handlePageChange = (page: number) => {
    router.push(buildCatalogUrl({ category, search, sort, onSale, page }))
  }

  return <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
}
