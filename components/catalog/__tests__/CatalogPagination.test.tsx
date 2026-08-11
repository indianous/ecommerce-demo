import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CatalogPagination } from '../CatalogPagination'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

describe('CatalogPagination', () => {
  it('does not render when there is only one page', () => {
    render(<CatalogPagination currentPage={1} totalPages={1} category={undefined} search={undefined} />)
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
  })

  it('navigates to the next page preserving filters', async () => {
    const user = userEvent.setup()
    render(<CatalogPagination currentPage={1} totalPages={3} category="eletronicos" search="teclado" />)

    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(pushMock).toHaveBeenCalledWith('/catalog?category=eletronicos&search=teclado&page=2')
  })
})
