'use client'

import { useRouter } from 'next/navigation'
import { SearchField } from 'base-ds'

interface Props {
  defaultValue: string
  categoryId: string | undefined
}

export function CatalogSearch({ defaultValue, categoryId }: Props) {
  const router = useRouter()

  const handleSearch = (value: string) => {
    const params = new URLSearchParams()
    if (categoryId) params.set('categoryId', categoryId)
    if (value) params.set('search', value)
    const query = params.toString()
    router.push(`/catalog${query ? `?${query}` : ''}`)
  }

  return <SearchField defaultValue={defaultValue} onSearch={handleSearch} placeholder="Buscar produtos..." />
}
