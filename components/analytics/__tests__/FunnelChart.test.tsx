import { render, screen, within } from '@testing-library/react'
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

    const body = screen.getByTestId('funnel-body')
    expect(within(body).getByText(/visitantes/i)).toBeInTheDocument()
    expect(within(body).getByText(/visualizou produto/i)).toBeInTheDocument()
    expect(within(body).getByText(/adicionou ao carrinho/i)).toBeInTheDocument()
    expect(within(body).getByText(/iniciou checkout/i)).toBeInTheDocument()
    expect(within(body).getByText(/comprou/i)).toBeInTheDocument()

    expect(body).toHaveTextContent('100')
    expect(body).toHaveTextContent('50')
    expect(body).toHaveTextContent('20')
    expect(body).toHaveTextContent('10')
    expect(body).toHaveTextContent('5')
  })

  it('exibe a queda percentual entre etapas consecutivas', () => {
    render(<FunnelChart data={data} />)

    const body = screen.getByTestId('funnel-body')
    // productViews (50) vem de visitors (100): queda de 50%
    expect(within(body).getByText(/visualizou produto/i).closest('button')).toHaveTextContent(
      '-50% vs anterior',
    )
    // cartAdds (20) vem de productViews (50): queda de 60%
    expect(within(body).getByText(/adicionou ao carrinho/i).closest('button')).toHaveTextContent(
      '-60% vs anterior',
    )
  })

  it('sinaliza que "Visualizou produto" e "Adicionou ao carrinho" refletem só clientes cadastrados', () => {
    render(<FunnelChart data={data} />)

    expect(
      screen.getByText(/visualizou produto e adicionou ao carrinho refletem só clientes cadastrados/i),
    ).toBeInTheDocument()
  })

  it('sem visitantes no período, não quebra (barras zeradas)', () => {
    const empty: FunnelResponse = {
      visitors: 0, productViews: 0, cartAdds: 0, checkoutsStarted: 0, purchasesCompleted: 0,
      visitorToProductViewRate: 0, productViewToCartAddRate: 0, cartAddToCheckoutRate: 0, checkoutToPurchaseRate: 0,
    }
    expect(() => render(<FunnelChart data={empty} />)).not.toThrow()
  })
})
