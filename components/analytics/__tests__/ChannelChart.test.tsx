import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChannelChart } from '../ChannelChart'
import type { ChannelConversionResponse } from '@/types'

const channels: ChannelConversionResponse[] = [
  { channel: 'google / cpc', signups: 10, buyers: 2, conversionRate: 0.2, revenue: 400, averageOrderValue: 200 },
  { channel: 'Direto/não identificado', signups: 5, buyers: 0, conversionRate: 0, revenue: 0, averageOrderValue: 0 },
]

describe('ChannelChart', () => {
  it('exibe a legenda com as duas séries (cadastros e compradores)', () => {
    render(<ChannelChart data={channels} />)

    expect(screen.getAllByText(/cadastros/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/compradores/i).length).toBeGreaterThan(0)
  })

  it('exibe cada canal com cadastros e compradores', () => {
    render(<ChannelChart data={channels} />)

    expect(screen.getAllByText('google / cpc').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Direto/não identificado').length).toBeGreaterThan(0)
  })

  it('canal "Direto/não identificado" aparece como qualquer outro, sem tratamento especial', () => {
    render(<ChannelChart data={channels} />)

    const body = screen.getByTestId('bar-chart-body')
    const directLabel = within(body).getByText('Direto/não identificado')
    const googleLabel = within(body).getByText('google / cpc')
    expect(directLabel.tagName).toBe(googleLabel.tagName)
  })

  it('exibe uma tabela com receita e ticket médio por canal', () => {
    render(<ChannelChart data={channels} />)

    const table = screen.getByRole('table', { name: /detalhamento por canal/i })
    expect(table).toHaveTextContent('R$ 400,00')
    expect(table).toHaveTextContent('R$ 200,00')
    expect(table).toHaveTextContent('20%')
  })

  it('sem canais no período, não quebra', () => {
    expect(() => render(<ChannelChart data={[]} />)).not.toThrow()
  })
})
