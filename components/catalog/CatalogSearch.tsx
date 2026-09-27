'use client'

import { useRouter } from 'next/navigation'
import { SearchField } from '@indianous/base-ds'
import { buildCatalogUrl } from './catalogUrl'
import type { ProductSort } from '@/types'

interface Props {
  defaultValue: string
  category: string | undefined
  sort?: ProductSort
  onSale?: boolean
}

export function CatalogSearch({ defaultValue, category, sort, onSale }: Props) {
  const router = useRouter()

  const handleSearch = (value: string) => {
    router.push(buildCatalogUrl({ category, search: value, sort, onSale }))
  }

  // key: o SearchField não é controlado; remonta quando a busca muda por outro caminho (a busca da navbar)
  return <SearchField key={defaultValue} defaultValue={defaultValue} onSearch={handleSearch} placeholder="Buscar produtos..." />
}
