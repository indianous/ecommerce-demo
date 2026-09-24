import { Button, Icon, NumberInput, SearchField, Table, Text, type TableColumn } from 'base-ds'
import { formatBRL } from '@/lib/format'
import type { Product } from '@/types'

export type ManualOrderLine = { product: Product; quantity: number }

export const unitPrice = (p: Product) => p.effectivePrice ?? p.price

/** Adiciona o produto; se já estiver na lista, soma 1 na linha existente em vez de duplicar. */
export function addLine(lines: ManualOrderLine[], product: Product): ManualOrderLine[] {
  if (lines.some((l) => l.product.id === product.id)) {
    return lines.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l))
  }
  return [...lines, { product, quantity: 1 }]
}

export function lineError(line: ManualOrderLine): string | undefined {
  if (line.quantity < 1) return 'Use ao menos 1'
  if (line.quantity > line.product.stockQuantity) return `Só há ${line.product.stockQuantity} em estoque`
  return undefined
}

export const linesSubtotal = (lines: ManualOrderLine[]) =>
  lines.reduce((sum, l) => sum + unitPrice(l.product) * l.quantity, 0)

interface Props {
  lines: ManualOrderLine[]
  onQuantityChange: (productId: string, quantity: number) => void
  onRemove: (productId: string) => void
  /** Resultado da última busca (`null` antes de buscar). */
  searchResults: Product[] | null
  searching: boolean
  onSearch: (term: string) => void
  onAdd: (product: Product) => void
}

export function ManualOrderItemsForm({ lines, onQuantityChange, onRemove, searchResults, searching, onSearch, onAdd }: Props) {
  const columns: TableColumn<ManualOrderLine>[] = [
    { key: 'product', header: 'Produto', render: (l) => l.product.name },
    {
      key: 'price',
      header: 'Preço',
      render: (l) => (
        <span className="inline-flex flex-wrap items-center gap-2">
          {l.product.onPromotion && <s className="text-muted-foreground">{formatBRL(l.product.price)}</s>}
          <span>{formatBRL(unitPrice(l.product))}</span>
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantidade',
      render: (l) => {
        const error = lineError(l)
        return (
          <div className="flex flex-col gap-1">
            <NumberInput
              id={`manual-order-qty-${l.product.id}`}
              aria-label={`Quantidade de ${l.product.name}`}
              aria-invalid={!!error}
              value={l.quantity}
              min={1}
              onChange={(quantity) => onQuantityChange(l.product.id, quantity)}
            />
            {error && <Text size="sm" color="destructive">{error}</Text>}
          </div>
        )
      },
    },
    { key: 'subtotal', header: 'Subtotal', render: (l) => formatBRL(unitPrice(l.product) * l.quantity) },
    {
      key: 'actions',
      header: <span className="sr-only">Ações</span>,
      render: (l) => (
        <Button iconOnly leftIcon={<Icon name="Trash2" size="sm" />} aria-label={`Remover ${l.product.name}`}
          variant="danger" size="sm" onClick={() => onRemove(l.product.id)} />
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <SearchField id="manual-order-product-search" label="Buscar produto" placeholder="Nome do produto..."
        onSearch={onSearch} isLoading={searching} />

      {searchResults !== null && (
        searchResults.length === 0 ? (
          <Text size="sm" color="muted">Nenhum produto disponível encontrado.</Text>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Produtos encontrados">
            {searchResults.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <Text size="sm">
                  {p.name} — {formatBRL(unitPrice(p))} — {p.stockQuantity} em estoque
                </Text>
                <Button leftIcon={<Icon name="Plus" size="sm" />} size="sm" variant="outline"
                  aria-label={`Adicionar ${p.name}`} disabled={p.stockQuantity < 1} onClick={() => onAdd(p)}>
                  Adicionar
                </Button>
              </li>
            ))}
          </ul>
        )
      )}

      {lines.length === 0 ? (
        <Text size="sm" color="muted">Nenhum item no pedido.</Text>
      ) : (
        <>
          <Table columns={columns} data={lines} caption="Itens do pedido" />
          <Text weight="semibold">Subtotal dos itens: {formatBRL(linesSubtotal(lines))}</Text>
        </>
      )}
    </div>
  )
}
