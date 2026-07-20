import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NavbarSearch } from '../NavbarSearch'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

describe('NavbarSearch', () => {
  it('renders a search form', () => {
    render(<NavbarSearch />)
    expect(screen.getByRole('search')).toBeInTheDocument()
  })

  it('navigates to catalog with search term on submit', async () => {
    const user = userEvent.setup()
    render(<NavbarSearch />)

    await user.type(screen.getByRole('textbox', { name: /search input/i }), 'tênis')
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(pushMock).toHaveBeenCalledWith('/catalog?search=t%C3%AAnis')
  })

  it('navigates to catalog without query string when submitted empty', async () => {
    const user = userEvent.setup()
    render(<NavbarSearch />)

    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(pushMock).toHaveBeenCalledWith('/catalog')
  })
})
