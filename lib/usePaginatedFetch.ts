'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export interface PageResult<T> {
  content: T[]
  totalPages: number
}

/**
 * Esqueleto compartilhado de paginação real: page vem da URL (?page=),
 * goToPage escreve de volta na URL, fetcher recebe page/size já prontos
 * em URLSearchParams (e é responsável por acrescentar seus próprios
 * filtros — search, status etc. — antes de chamar o BFF).
 */
export function usePaginatedFetch<T>(
  fetcher: (params: URLSearchParams) => Promise<PageResult<T> | null>,
  size = 20,
) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))

  const [items, setItems] = useState<T[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page - 1), size: String(size) })
    const result = await fetcher(params)
    if (result) {
      setItems(result.content)
      setTotalPages(result.totalPages)
    }
    setLoading(false)
  }, [page, size, fetcher])

  useEffect(() => {
    load()
  }, [load])

  const goToPage = useCallback((next: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(next))
    router.push(`${pathname}?${params.toString()}`)
  }, [searchParams, router, pathname])

  /** Chamar após busca/filtro mudar: volta pra página 1 (refetch automático se já estava nela). */
  const reload = useCallback(() => {
    if (page !== 1) goToPage(1)
    else load()
  }, [page, goToPage, load])

  return { page, items, setItems, totalPages, loading, goToPage, reload }
}
