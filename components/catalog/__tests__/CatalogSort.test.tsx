import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CatalogSort } from '../CatalogSort'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

describe('CatalogSort', () => {
  it('renderiza as 4 opções de ordenação', () => {
    render(<CatalogSort value="NAME_ASC" category={undefined} search={undefined} />)

    const select = screen.getByRole('combobox', { name: /ordenar por/i })
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Nome (A-Z)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Menor preço' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Maior preço' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Mais recentes' })).toBeInTheDocument()
  })

  it('valor inicial reflete a prop value recebida', () => {
    render(<CatalogSort value="PRICE_DESC" category={undefined} search={undefined} />)

    expect(screen.getByRole('combobox', { name: /ordenar por/i })).toHaveValue('PRICE_DESC')
  })

  it('trocar a opção navega preservando category/search e resetando a página', async () => {
    const user = userEvent.setup()
    render(<CatalogSort value="NAME_ASC" category="eletronicos" search="teclado" />)

    await user.selectOptions(screen.getByRole('combobox', { name: /ordenar por/i }), 'PRICE_ASC')

    expect(pushMock).toHaveBeenCalledWith('/catalog?category=eletronicos&search=teclado&sort=PRICE_ASC')
  })

  it('trocar a opção preserva o filtro "Em promoção"', async () => {
    const user = userEvent.setup()
    render(<CatalogSort value="NAME_ASC" category={undefined} search={undefined} onSale />)

    await user.selectOptions(screen.getByRole('combobox', { name: /ordenar por/i }), 'PRICE_ASC')

    expect(pushMock).toHaveBeenCalledWith('/catalog?sort=PRICE_ASC&onSale=true')
  })

  it('tem o rótulo visível "Ordenar por", associado ao select (plano 66, etapa 8)', () => {
    render(<CatalogSort value="NAME_ASC" category={undefined} search={undefined} />)

    const label = screen.getByText('Ordenar por')
    expect(label.tagName).toBe('LABEL')
    expect(label).toHaveAttribute('for', 'catalog-sort')
    expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toHaveAttribute('id', 'catalog-sort')
  })
})
