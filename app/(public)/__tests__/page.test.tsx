import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Home from '../page'

describe('Home', () => {
  it('renders a single top-level heading', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('links to the catalog', () => {
    render(<Home />)
    expect(screen.getByRole('link', { name: /ver catálogo/i })).toHaveAttribute(
      'href',
      '/catalog',
    )
  })
})
