'use client'

import { useRouter } from 'next/navigation'
import { Select } from 'base-ds'
import { buildCatalogUrl } from './catalogUrl'
import type { ProductSort } from '@/types'

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'NAME_ASC', label: 'Nome (A-Z)' },
  { value: 'PRICE_ASC', label: 'Menor preço' },
  { value: 'PRICE_DESC', label: 'Maior preço' },
  { value: 'NEWEST', label: 'Mais recentes' },
]

interface Props {
  value: ProductSort
  category: string | undefined
  search: string | undefined
  onSale?: boolean
}

export function CatalogSort({ value, category, search, onSale }: Props) {
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sort = e.target.value as ProductSort
    router.push(buildCatalogUrl({ category, search, sort, onSale }))
  }

  return (
    <Select
      id="catalog-sort"
      aria-label="Ordenar por"
      value={value}
      onChange={handleChange}
      options={SORT_OPTIONS}
    />
  )
}
