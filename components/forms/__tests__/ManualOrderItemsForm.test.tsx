import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { addLine, ManualOrderItemsForm, type ManualOrderLine } from '../ManualOrderItemsForm'
import type { Product } from '@/types'

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1', name: 'Laptop', slug: 'laptop', price: 100, effectivePrice: 100, stockQuantity: 5,
    categories: [], imageUrls: [], freeShipping: false, active: true, ...overrides,
  } as Product
}

const laptop = product()
const mouse = product({ id: 'p2', name: 'Mouse', slug: 'mouse', price: 50, effectivePrice: 40, onPromotion: true })

function renderForm(props: Partial<React.ComponentProps<typeof ManualOrderItemsForm>> = {}) {
  const handlers = { onQuantityChange: vi.fn(), onRemove: vi.fn(), onSearch: vi.fn(), onAdd: vi.fn() }
  render(<ManualOrderItemsForm lines={[]} searchResults={null} searching={false} {...handlers} {...props} />)
  return handlers
}

describe('ManualOrderItemsForm', () => {
  it('a busca chama onSearch e "Adicionar" repassa o produto', async () => {
    const user = userEvent.setup()
    const { onSearch, onAdd } = renderForm({ searchResults: [laptop] })

    await user.type(screen.getByLabelText(/buscar produto/i), 'lap{Enter}')
    expect(onSearch).toHaveBeenCalledWith('lap')

    await user.click(screen.getByRole('button', { name: /adicionar laptop/i }))
    expect(onAdd).toHaveBeenCalledWith(laptop)
  })

  it('altera a quantidade e remove a linha', async () => {
    const user = userEvent.setup()
    const { onQuantityChange, onRemove } = renderForm({ lines: [{ product: laptop, quantity: 1 }] })
    const row = screen.getByText('Laptop').closest('tr') as HTMLElement

    await user.click(within(row).getByRole('button', { name: /increment/i }))
    expect(onQuantityChange).toHaveBeenCalledWith('p1', 2)

    await user.click(within(row).getByRole('button', { name: /remover laptop/i }))
    expect(onRemove).toHaveBeenCalledWith('p1')
  })

  it('quantidade acima do estoque → erro na linha', () => {
    renderForm({ lines: [{ product: laptop, quantity: 6 }] })
    const row = screen.getByText('Laptop').closest('tr') as HTMLElement

    expect(within(row).getByText(/só há 5 em estoque/i)).toBeInTheDocument()
  })

  it('subtotal pelo preço efetivo, com o preço cheio riscado quando em promoção', () => {
    renderForm({ lines: [{ product: laptop, quantity: 2 }, { product: mouse, quantity: 1 }] })
    const row = screen.getByText('Mouse').closest('tr') as HTMLElement

    expect(within(row).getByText(/R\$\s*50,00/).tagName).toBe('S')
    expect(within(row).getAllByText(/R\$\s*40,00/).length).toBeGreaterThan(0)
    expect(screen.getByText(/subtotal dos itens/i)).toHaveTextContent(/R\$\s*240,00/)
  })
})

describe('addLine', () => {
  it('produto novo entra com quantidade 1; repetido soma na mesma linha', () => {
    let lines: ManualOrderLine[] = addLine([], laptop)
    lines = addLine(lines, mouse)
    lines = addLine(lines, laptop)

    expect(lines).toEqual([{ product: laptop, quantity: 2 }, { product: mouse, quantity: 1 }])
  })
})
