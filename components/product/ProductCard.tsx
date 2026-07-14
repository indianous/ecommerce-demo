'use client'
import type { Product } from '@/types'

interface Props {
  product: Product
}

export function ProductCard({ product }: Props) {
  const inStock = product.stockQuantity > 0
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(product.price)

  return (
    <article className="flex flex-col gap-2 rounded-lg border p-4">
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-48 w-full object-cover rounded"
        />
      )}

      <span className="text-sm text-gray-500">{product.categoryName}</span>
      <h3 className="font-semibold text-gray-900">{product.name}</h3>

      {product.description && (
        <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-lg font-bold text-gray-900">{formattedPrice}</span>

        {inStock ? (
          <button
            type="button"
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
          >
            Adicionar ao carrinho
          </button>
        ) : (
          <span className="text-sm text-red-500">Sem estoque</span>
        )}
      </div>
    </article>
  )
}
