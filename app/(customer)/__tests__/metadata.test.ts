import { describe, expect, it } from 'vitest'
import { metadata as cartMetadata } from '../cart/page'
import { metadata as checkoutMetadata } from '../checkout/page'
import { metadata as ordersMetadata } from '../orders/page'
import { metadata as profileMetadata } from '../profile/page'
import { metadata as reviewsMetadata } from '../reviews/page'

describe('(customer) — metadata.title', () => {
  it.each([
    ['cart/page.tsx', cartMetadata, 'Carrinho'],
    ['checkout/page.tsx', checkoutMetadata, 'Finalizar pedido'],
    ['orders/page.tsx', ordersMetadata, 'Meus pedidos'],
    ['profile/page.tsx', profileMetadata, 'Meus dados'],
    ['reviews/page.tsx', reviewsMetadata, 'Minhas avaliações'],
  ])('%s exporta title %s', (_name, metadata, expectedTitle) => {
    expect(metadata.title).toBe(expectedTitle)
  })
})
