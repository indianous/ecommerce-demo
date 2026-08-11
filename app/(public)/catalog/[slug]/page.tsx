import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Badge, Breadcrumb, Heading, Image, Text } from 'base-ds'
import { AddToCartButton } from '@/components/product/AddToCartButton'
import { ProductCarousel } from '@/components/product/ProductCarousel'
import { ProductRatingSummary } from '@/components/product/ProductRatingSummary'
import { ProductReviewsSection } from '@/components/product/ProductReviewsSection'
import { ProductViewTracker } from '@/components/product/ProductViewTracker'
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

async function fetchProductBySlug(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API}/catalog/products/slug/${slug}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function fetchProductByUuid(id: string): Promise<Product | null> {
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

async function fetchRelatedProducts(id: string): Promise<Product[]> {
  try {
    const res = await fetch(`${API}/catalog/products/${id}/related?limit=6`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = (await fetchProductBySlug(slug)) ?? (await fetchProductByUuid(slug))
  if (!product) return { title: 'Produto não encontrado' }
  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.description,
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const bySlug = await fetchProductBySlug(slug)
  const product = bySlug ?? (await fetchProductByUuid(slug))
  if (!product) notFound()
  if (!bySlug) redirect(`/catalog/${product.slug}`)

  const reviews = await fetchReviews(product.id)
  const relatedProducts = await fetchRelatedProducts(product.id)

  const onPromotion = product.onPromotion ?? false
  const effectivePrice = product.effectivePrice ?? product.price
  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

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
          <div className="flex items-center gap-2">
            <Badge variant="default" size="sm" className="w-fit">
              {product.categoryName}
            </Badge>
            {onPromotion && (
              <Badge variant="danger" size="sm" className="w-fit">
                Promoção
              </Badge>
            )}
          </div>
          <Heading as="h1" size="2xl">
            {product.name}
          </Heading>

          <ProductRatingSummary
            averageRating={product.averageRating ?? null}
            reviewCount={product.reviewCount ?? 0}
          />

          {product.description && <Text>{product.description}</Text>}

          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              {onPromotion && (
                <Text size="sm" color="muted" className="line-through">
                  {formatBRL(product.price)}
                </Text>
              )}
              <Text weight="bold" size="lg">
                {formatBRL(effectivePrice)}
              </Text>
            </div>
            <AddToCartButton product={product} />
          </div>
        </div>
      </div>

      <ProductReviewsSection productId={product.id} reviews={reviews} />

      <ProductCarousel title="Produtos relacionados" products={relatedProducts} />

      <ProductViewTracker productId={product.id} />
    </main>
  )
}
