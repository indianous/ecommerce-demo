import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CatalogOnSaleToggle } from '../CatalogOnSaleToggle'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

beforeEach(() => pushMock.mockClear())

describe('CatalogOnSaleToggle', () => {
  it('ligar "Em promoção" adiciona onSale=true preservando category, search e sort, e volta à página 1', async () => {
    const user = userEvent.setup()
    render(<CatalogOnSaleToggle checked={false} category="tech" search="fone" sort="PRICE_ASC" />)

    await user.click(screen.getByRole('switch', { name: /em promoção/i }))

    expect(pushMock).toHaveBeenCalledWith('/catalog?category=tech&search=fone&sort=PRICE_ASC&onSale=true')
  })

  it('desligar remove o onSale da URL', async () => {
    const user = userEvent.setup()
    render(<CatalogOnSaleToggle checked category={undefined} search={undefined} />)

    expect(screen.getByRole('switch', { name: /em promoção/i })).toBeChecked()
    await user.click(screen.getByRole('switch', { name: /em promoção/i }))

    expect(pushMock).toHaveBeenCalledWith('/catalog')
  })
})
