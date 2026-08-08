import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NotFound from '../not-found'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('NotFound', () => {
  it('renders a single top-level heading', () => {
    render(<NotFound />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('links back to the home page', () => {
    render(<NotFound />)
    expect(screen.getByRole('link', { name: /voltar para o início/i })).toHaveAttribute('href', '/')
  })

  it('renders the main navigation', () => {
    render(<NotFound />)
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })

  it('renders the footer landmark', () => {
    render(<NotFound />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
