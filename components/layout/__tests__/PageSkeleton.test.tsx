import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageSkeleton } from '../PageSkeleton'

describe('PageSkeleton', () => {
  it('é anunciado como carregamento da página', () => {
    render(<PageSkeleton />)

    expect(screen.getByRole('status', { name: 'Carregando página' })).toBeInTheDocument()
  })

  it('não renderiza <main>: o landmark é do shell', () => {
    render(<PageSkeleton />)

    expect(screen.queryByRole('main')).not.toBeInTheDocument()
  })
})
