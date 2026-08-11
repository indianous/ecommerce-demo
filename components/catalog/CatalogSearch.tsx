'use client'

import { useRouter } from 'next/navigation'
import { SearchField } from 'base-ds'

interface Props {
  defaultValue: string
  category: string | undefined
}

export function CatalogSearch({ defaultValue, category }: Props) {
  const router = useRouter()

  const handleSearch = (value: string) => {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (value) params.set('search', value)
    const query = params.toString()
    router.push(`/catalog${query ? `?${query}` : ''}`)
  }

  return <SearchField defaultValue={defaultValue} onSearch={handleSearch} placeholder="Buscar produtos..." />
}
