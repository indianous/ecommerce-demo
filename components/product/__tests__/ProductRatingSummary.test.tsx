import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProductRatingSummary } from '../ProductRatingSummary'

describe('ProductRatingSummary', () => {
  it('renderiza a nota média arredondada e a contagem de avaliações', () => {
    render(<ProductRatingSummary averageRating={4.6} reviewCount={12} />)

    expect(screen.getByRole('radiogroup', { name: /rating/i })).toBeInTheDocument()
    expect(screen.getByText(/12 avaliações/)).toBeInTheDocument()
  })

  it('mostra "Seja o primeiro a avaliar" quando reviewCount é 0', () => {
    render(<ProductRatingSummary averageRating={null} reviewCount={0} />)

    expect(screen.getByText(/seja o primeiro a avaliar/i)).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup', { name: /rating/i })).not.toBeInTheDocument()
  })
})
