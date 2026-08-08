import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Badge, Breadcrumb, Heading, Image, Text } from 'base-ds'
import { AddToCartButton } from '@/components/product/AddToCartButton'
import { ProductRatingSummary } from '@/components/product/ProductRatingSummary'
import { ProductReviewsSection } from '@/components/product/ProductReviewsSection'
import type { Product, ProductReviewPage } from '@/types'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

const EMPTY_REVIEWS: ProductReviewPage = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  last: true,
  averageRating: null,
  totalReviews: 0,
}

async function fetchProduct(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API}/catalog/products/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function fetchReviews(id: string): Promise<ProductReviewPage> {
  try {
    const res = await fetch(`${API}/products/${id}/reviews`, { next: { revalidate: 30 } })
    if (!res.ok) return EMPTY_REVIEWS
    return res.json()
  } catch {
    return EMPTY_REVIEWS
  }
}

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const product = await fetchProduct(id)
  if (!product) return { title: 'Produto não encontrado' }
  return { title: product.name, description: product.description }
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const product = await fetchProduct(id)
  if (!product) notFound()

  const reviews = await fetchReviews(id)

  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(product.price)

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 flex flex-col gap-10">
      <Breadcrumb
        items={[
          { label: 'Catálogo', href: '/catalog' },
          { label: product.categoryName, href: `/catalog?categoryId=${product.categoryId}` },
          { label: product.name },
        ]}
        className="-mb-4"
      />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            aspectRatio="portrait"
            objectFit="contain"
            className="rounded"
          />
        ) : (
          <div
            role="img"
            aria-label={product.name}
            className="flex aspect-[3/4] items-center justify-center rounded bg-muted text-muted-foreground"
          />
        )}

        <div className="flex flex-col gap-4">
          <Badge variant="default" size="sm" className="w-fit">
            {product.categoryName}
          </Badge>
          <Heading as="h1" size="2xl">
            {product.name}
          </Heading>

          <ProductRatingSummary
            averageRating={product.averageRating ?? null}
            reviewCount={product.reviewCount ?? 0}
          />

          {product.description && <Text>{product.description}</Text>}

          <div className="flex items-center gap-4">
            <Text weight="bold" size="lg">
              {formattedPrice}
            </Text>
            <AddToCartButton product={product} />
          </div>
        </div>
      </div>

      <ProductReviewsSection productId={product.id} reviews={reviews} />
    </main>
  )
}
