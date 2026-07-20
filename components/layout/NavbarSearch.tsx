'use client'

import { useRouter } from 'next/navigation'
import { SearchField } from 'base-ds'

export function NavbarSearch() {
  const router = useRouter()

  const handleSearch = (value: string) => {
    const params = new URLSearchParams()
    if (value) params.set('search', value)
    router.push(`/catalog${params.size ? `?${params}` : ''}`)
  }

  return <SearchField onSearch={handleSearch} placeholder="Buscar produtos…" />
}
