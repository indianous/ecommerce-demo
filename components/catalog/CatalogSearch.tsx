'use client'

import { useRouter } from 'next/navigation'
import { SearchField } from 'base-ds'
import { buildCatalogUrl } from './catalogUrl'
import type { ProductSort } from '@/types'

interface Props {
  defaultValue: string
  category: string | undefined
  sort?: ProductSort
}

export function CatalogSearch({ defaultValue, category, sort }: Props) {
  const router = useRouter()

  const handleSearch = (value: string) => {
    router.push(buildCatalogUrl({ category, search: value, sort }))
  }

  return <SearchField defaultValue={defaultValue} onSearch={handleSearch} placeholder="Buscar produtos..." />
}
