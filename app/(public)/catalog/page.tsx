import type { Metadata } from 'next'
import Link from 'next/link'
import { ProductCard } from '@/components/product/ProductCard'

export const metadata: Metadata = {
  title: 'Catálogo',
  description: 'Navegue por todos os nossos produtos.',
}
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
): Promise<ProductPage> {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (search) params.set('search', search)
  if (sort) params.set('sort', sort)
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
  searchParams: Promise<{ category?: string; search?: string; sort?: ProductSort; page?: string }>
}

export default async function CatalogPage({ searchParams }: Props) {
  const { category, search, sort, page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const [data, categories] = await Promise.all([
    fetchProducts(category, search, sort, page),
    fetchCategories(),
  ])

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Catálogo</h1>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CatalogSearch defaultValue={search ?? ''} category={category} sort={sort} />
        <CatalogSort value={sort ?? 'NAME_ASC'} category={category} search={search} />
      </div>

      {categories.length > 0 && (
        <nav className="mb-6 flex flex-wrap gap-2">
          <Link href="/catalog" className="rounded-full border px-4 py-1 text-sm hover:bg-gray-100">
            Todos
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={buildCatalogUrl({ category: cat.slug, search, sort })}
              className="rounded-full border px-4 py-1 text-sm hover:bg-gray-100"
            >
              {cat.name}
            </Link>
          ))}
        </nav>
      )}

      {data.content.length === 0 ? (
        <p className="text-gray-500">Nenhum produto encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {data.content.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <CatalogPagination
          currentPage={page}
          totalPages={data.totalPages}
          category={category}
          search={search}
          sort={sort}
        />
      </div>
    </main>
  )
}
