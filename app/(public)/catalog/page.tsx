import { ProductCard } from '@/components/product/ProductCard'
import type { ProductPage, Category } from '@/types'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

async function fetchProducts(categoryId?: string, search?: string): Promise<ProductPage> {
  const params = new URLSearchParams()
  if (categoryId) params.set('categoryId', categoryId)
  if (search) params.set('search', search)

  const res = await fetch(`${API}/catalog/products?${params}`, { next: { revalidate: 60 } })
  if (!res.ok) return { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true }
  return res.json()
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API}/catalog/categories`, { next: { revalidate: 300 } })
  if (!res.ok) return []
  return res.json()
}

interface Props {
  searchParams: Promise<{ categoryId?: string; search?: string }>
}

export default async function CatalogPage({ searchParams }: Props) {
  const { categoryId, search } = await searchParams
  const [data, categories] = await Promise.all([
    fetchProducts(categoryId, search),
    fetchCategories(),
  ])

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Catálogo</h1>

      {categories.length > 0 && (
        <nav className="mb-6 flex flex-wrap gap-2">
          <a href="/catalog" className="rounded-full border px-4 py-1 text-sm hover:bg-gray-100">
            Todos
          </a>
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`/catalog?categoryId=${cat.id}`}
              className="rounded-full border px-4 py-1 text-sm hover:bg-gray-100"
            >
              {cat.name}
            </a>
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
    </main>
  )
}
