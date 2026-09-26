import type { Metadata } from 'next'
import Link from 'next/link'
import { Container, Heading, Text } from 'base-ds'
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

/** "12 produtos" · "1 produto · resultados para "camisa"". */
function summary(total: number, search?: string) {
  const count = total === 1 ? '1 produto' : `${total} produtos`
  return search ? `${count} · resultados para "${search}"` : count
}

function categoryLinkClass(current: boolean) {
  return current
    ? 'rounded-full border border-primary bg-primary px-4 py-1 text-sm text-primary-foreground'
    : 'rounded-full border border-border px-4 py-1 text-sm text-foreground hover:bg-muted'
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
      <div className="mb-6 flex flex-col gap-1">
        <Heading as="h1" size="2xl">
          Catálogo
        </Heading>
        <Text color="muted">{summary(data.totalElements, search)}</Text>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 sm:max-w-xl">
          <CatalogSearch defaultValue={search ?? ''} category={category} sort={sort} onSale={onSale} />
        </div>
        <div className="flex flex-wrap items-end gap-4 sm:ml-auto">
          <CatalogOnSaleToggle checked={onSale} category={category} search={search} sort={sort} />
          <CatalogSort value={sort ?? 'NAME_ASC'} category={category} search={search} onSale={onSale} />
        </div>
      </div>

      {categories.length > 0 && (
        <nav aria-label="Categorias" className="mb-6 flex flex-wrap gap-2">
          <Link
            href={buildCatalogUrl({ search, sort, onSale })}
            aria-current={!category ? 'page' : undefined}
            className={categoryLinkClass(!category)}
          >
            Todos
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={buildCatalogUrl({ category: cat.slug, search, sort, onSale })}
              aria-current={cat.slug === category ? 'page' : undefined}
              className={categoryLinkClass(cat.slug === category)}
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
