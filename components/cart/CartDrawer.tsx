'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge, Button, Drawer, Icon, Text, Tooltip } from 'base-ds'
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
      <div className="relative inline-flex">
        <Tooltip label={`Carrinho (${itemCount})`} position="bottom">
          <Button iconOnly leftIcon={<Icon name="ShoppingCart" size="sm" />} variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <span className="sr-only">{`Carrinho (${itemCount})`}</span>
          </Button>
        </Tooltip>
        {itemCount > 0 && (
          <span aria-hidden="true" className="pointer-events-none absolute -right-1 -top-1">
            <Badge variant="primary" size="sm" className="!px-1.5 !py-0">
              {itemCount}
            </Badge>
          </span>
        )}
      </div>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Carrinho"
        side="right"
        footer={
          <div className="flex flex-col gap-3">
            <Text weight="bold">Total: {formatBRL(total)}</Text>
            <Link
              href="/cart"
              onClick={() => setOpen(false)}
              className="rounded-md border border-border px-4 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Ver carrinho completo
            </Link>
            <Link
              href="/checkout"
              onClick={() => setOpen(false)}
              className="rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Finalizar compra
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
