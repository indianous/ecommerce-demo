'use client'

import Link from 'next/link'
import { Heading, NumberInput, Table, Text, type TableColumn } from 'base-ds'
import { IconButton } from '@/components/ui/IconButton'
import { useCartStore, selectCartTotal } from '@/stores/cart.store'
import type { CartItem } from '@/types'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore()
  const total = useCartStore(selectCartTotal)

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Heading as="h1" size="2xl" className="mb-4">
          Carrinho
        </Heading>
        <Text color="muted" className="mb-6">
          Seu carrinho está vazio.
        </Text>
        <Link
          href="/catalog"
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Ver catálogo
        </Link>
      </main>
    )
  }

  const columns: TableColumn<CartItem>[] = [
    { key: 'name', header: 'Produto', render: (item) => item.name },
    { key: 'price', header: 'Preço unitário', render: (item) => formatBRL(item.price) },
    {
      key: 'quantity',
      header: 'Quantidade',
      render: (item) => (
        <NumberInput
          id={`quantity-${item.productId}`}
          value={item.quantity}
          min={1}
          onChange={(value) => updateQuantity(item.productId, value)}
        />
      ),
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      render: (item) => formatBRL(item.price * item.quantity),
    },
    {
      key: 'remove',
      header: '',
      render: (item) => (
        <IconButton
          icon="Trash2"
          label={`Remover ${item.name}`}
          variant="danger"
          size="sm"
          onClick={() => removeItem(item.productId)}
        />
      ),
    },
  ]

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Heading as="h1" size="2xl" className="mb-6">
        Carrinho
      </Heading>

      <Table columns={columns} data={items} />

      <div className="mt-6 flex items-center justify-between">
        <Text weight="bold" size="lg">
          Total: {formatBRL(total)}
        </Text>

        <Link
          href="/checkout"
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Finalizar pedido
        </Link>
      </div>
    </main>
  )
}
