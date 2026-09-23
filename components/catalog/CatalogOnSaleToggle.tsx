'use client'

import { useRouter } from 'next/navigation'
import { Switch } from 'base-ds'
import { buildCatalogUrl } from './catalogUrl'
import type { ProductSort } from '@/types'

interface Props {
  checked: boolean
  category: string | undefined
  search: string | undefined
  sort?: ProductSort
}

/** Filtro "Em promoção" do catálogo: mantém categoria, busca e ordenação e volta para a página 1. */
export function CatalogOnSaleToggle({ checked, category, search, sort }: Props) {
  const router = useRouter()

  return (
    <Switch
      id="catalog-on-sale"
      label="Em promoção"
      checked={checked}
      onChange={(next) => router.push(buildCatalogUrl({ category, search, sort, onSale: next }))}
    />
  )
}
