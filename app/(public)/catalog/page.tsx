import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from 'base-ds'
import { ProductGrid } from '@/components/product/ProductGrid'

export const metadata: Metadata = {
  title: 'Catálogo',
  description: 'Navegue por todos os nossos produtos.',
}
import { CatalogOnSaleToggle } from '@/components/catalog/CatalogOnSaleToggle'
import { CatalogPagination } from '@/components/catalog/CatalogPagination'
import { CatalogSearch } from '@/components/catalog/CatalogSearch'
import { CatalogSort } from '@/components/catalog/CatalogSort'
import { buildCatalogUrl } from '@/components/catalog/catalogUrl'
import type { ProductPage, Category, ProductSort } from '@/types'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

async function fetchProducts(
  category?: string,
  search?: string,
  sort?: ProductSort,
  page = 1,
  onSale = false,
): Promise<ProductPage> {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (search) params.set('search', search)
  if (sort) params.set('sort', sort)
  if (onSale) params.set('onSale', 'true')
  params.set('page', String(page - 1))

  try {
    const res = await fetch(`${API}/catalog/products?${params}`, { next: { revalidate: 60 } })
    if (!res.ok) return { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true }
    return res.json()
  } catch {
    return { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true }
  }
}

async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API}/catalog/categories`, { next: { revalidate: 300 } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

interface Props {
  searchParams: Promise<{ category?: string; search?: string; sort?: ProductSort; page?: string; onSale?: string }>
}

export default async function CatalogPage({ searchParams }: Props) {
  const { category, search, sort, page: pageParam, onSale: onSaleParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const onSale = onSaleParam === 'true'
  const [data, categories] = await Promise.all([
    fetchProducts(category, search, sort, page, onSale),
    fetchCategories(),
  ])

  return (
    <Container width="7xl">
      <h1 className="mb-6 text-2xl font-bold">Catálogo</h1>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CatalogSearch defaultValue={search ?? ''} category={category} sort={sort} onSale={onSale} />
        <div className="flex items-center gap-4">
          <CatalogOnSaleToggle checked={onSale} category={category} search={search} sort={sort} />
          <CatalogSort value={sort ?? 'NAME_ASC'} category={category} search={search} onSale={onSale} />
        </div>
      </div>

      {categories.length > 0 && (
        <nav className="mb-6 flex flex-wrap gap-2">
          <Link href="/catalog" className="rounded-full border px-4 py-1 text-sm hover:bg-gray-100">
            Todos
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={buildCatalogUrl({ category: cat.slug, search, sort, onSale })}
              className="rounded-full border px-4 py-1 text-sm hover:bg-gray-100"
            >
              {cat.name}
            </Link>
          ))}
        </nav>
      )}

      <ProductGrid products={data.content} />

      <div className="mt-8 flex justify-center">
        <CatalogPagination
          currentPage={page}
          totalPages={data.totalPages}
          category={category}
          search={search}
          sort={sort}
          onSale={onSale}
        />
      </div>
    </Container>
  )
}
