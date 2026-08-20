import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FunnelChart } from '../FunnelChart'
import type { FunnelResponse } from '@/types'

const data: FunnelResponse = {
  visitors: 100,
  productViews: 50,
  cartAdds: 20,
  checkoutsStarted: 10,
  purchasesCompleted: 5,
  visitorToProductViewRate: 0.5,
  productViewToCartAddRate: 0.4,
  cartAddToCheckoutRate: 0.3,
  checkoutToPurchaseRate: 0.2,
}

describe('FunnelChart', () => {
  it('exibe as 5 etapas com seus valores', () => {
    render(<FunnelChart data={data} />)

    expect(screen.getByText(/visitantes/i)).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText(/visualizou produto/i)).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText(/adicionou ao carrinho/i)).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText(/iniciou checkout/i)).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText(/comprou/i)).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('exibe a taxa de conversão entre etapas consecutivas', () => {
    render(<FunnelChart data={data} />)

    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('sinaliza que "Visualizou produto" e "Adicionou ao carrinho" refletem só clientes cadastrados', () => {
    render(<FunnelChart data={data} />)

    const productViewsRow = screen.getByText(/visualizou produto/i).closest('[data-stage]')
    const cartAddsRow = screen.getByText(/adicionou ao carrinho/i).closest('[data-stage]')
    expect(productViewsRow).toHaveTextContent(/só clientes cadastrados/i)
    expect(cartAddsRow).toHaveTextContent(/só clientes cadastrados/i)

    const visitorsRow = screen.getByText(/^visitantes$/i).closest('[data-stage]')
    expect(visitorsRow).not.toHaveTextContent(/só clientes cadastrados/i)
  })

  it('sem visitantes no período, não quebra (barras zeradas)', () => {
    const empty: FunnelResponse = {
      visitors: 0, productViews: 0, cartAdds: 0, checkoutsStarted: 0, purchasesCompleted: 0,
      visitorToProductViewRate: 0, productViewToCartAddRate: 0, cartAddToCheckoutRate: 0, checkoutToPurchaseRate: 0,
    }
    expect(() => render(<FunnelChart data={empty} />)).not.toThrow()
    expect(screen.getAllByText('0')).toHaveLength(5)
  })

  it('alterna para visualização em tabela', async () => {
    const user = userEvent.setup()
    render(<FunnelChart data={data} />)

    await user.click(screen.getByRole('button', { name: /ver como tabela/i }))

    const table = screen.getByRole('table')
    expect(table).toHaveTextContent('Visitantes')
    expect(table).toHaveTextContent('100')
  })
})
