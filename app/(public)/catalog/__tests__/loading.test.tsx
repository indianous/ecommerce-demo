import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CatalogLoading from '../loading'

describe('CatalogLoading', () => {
  it('renderiza um container com role="status" e aria-label acessível', () => {
    render(<CatalogLoading />)

    expect(screen.getByRole('status', { name: /carregando produtos/i })).toBeInTheDocument()
  })

  it('renderiza 8 cards de skeleton, mesmo tamanho de página default do grid', () => {
    render(<CatalogLoading />)

    const status = screen.getByRole('status', { name: /carregando produtos/i })
    expect(status.children).toHaveLength(8)
  })
})
