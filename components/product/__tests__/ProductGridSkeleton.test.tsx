import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProductGridSkeleton } from '../ProductGrid'

describe('ProductGridSkeleton', () => {
  it('renderiza role="status" com aria-label "Carregando produtos"', () => {
    render(<ProductGridSkeleton />)

    expect(screen.getByRole('status', { name: /carregando produtos/i })).toBeInTheDocument()
  })

  it('renderiza 8 cards de skeleton por padrão', () => {
    render(<ProductGridSkeleton />)

    const status = screen.getByRole('status', { name: /carregando produtos/i })
    expect(status.children).toHaveLength(8)
  })

  it('count={4} renderiza 4 cards', () => {
    render(<ProductGridSkeleton count={4} />)

    const status = screen.getByRole('status', { name: /carregando produtos/i })
    expect(status.children).toHaveLength(4)
  })
})
