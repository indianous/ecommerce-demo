'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Drawer, Text } from 'base-ds'
import { useCartStore, selectCartTotal, selectItemCount } from '@/stores/cart.store'
import { CartCardItem } from './CartCardItem'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export function CartDrawer() {
  const [open, setOpen] = useState(false)
  const items = useCartStore((s) => s.items)
  const total = useCartStore(selectCartTotal)
  const itemCount = useCartStore(selectItemCount)

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Carrinho ({itemCount})
      </Button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Carrinho"
        side="right"
        footer={
          <div className="flex flex-col gap-3">
            <Text weight="bold">Total: {formatBRL(total)}</Text>
            <Link
              href="/checkout"
              onClick={() => setOpen(false)}
              className="rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Ver carrinho completo
            </Link>
          </div>
        }
      >
        {items.length === 0 ? (
          <Text color="muted">Seu carrinho está vazio.</Text>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.productId}>
                <CartCardItem item={item} />
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </>
  )
}
