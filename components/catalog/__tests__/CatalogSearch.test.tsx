import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CatalogSearch } from '../CatalogSearch'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

describe('CatalogSearch', () => {
  it('navigates with the search term, resetting the page', async () => {
    const user = userEvent.setup()
    render(<CatalogSearch defaultValue="" categoryId={undefined} />)

    await user.type(screen.getByRole('textbox', { name: /search input/i }), 'teclado')
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(pushMock).toHaveBeenCalledWith('/catalog?search=teclado')
  })

  it('preserves the current category filter when searching', async () => {
    const user = userEvent.setup()
    render(<CatalogSearch defaultValue="" categoryId="cat-1" />)

    await user.type(screen.getByRole('textbox', { name: /search input/i }), 'mouse')
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(pushMock).toHaveBeenCalledWith('/catalog?categoryId=cat-1&search=mouse')
  })
})
