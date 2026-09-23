import type { ProductSort } from '@/types'

export function buildCatalogUrl(params: {
  category?: string
  search?: string
  sort?: ProductSort
  onSale?: boolean
  page?: number
}): string {
  const usp = new URLSearchParams()
  if (params.category) usp.set('category', params.category)
  if (params.search) usp.set('search', params.search)
  if (params.sort && params.sort !== 'NAME_ASC') usp.set('sort', params.sort)
  if (params.onSale) usp.set('onSale', 'true')
  if (params.page && params.page > 1) usp.set('page', String(params.page))
  const qs = usp.toString()
  return `/catalog${qs ? `?${qs}` : ''}`
}
