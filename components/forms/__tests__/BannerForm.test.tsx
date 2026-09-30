import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BannerForm } from '../BannerForm'

function renderForm(linkUrl: string) {
  const file = new File(['x'], 'banner.jpg', { type: 'image/jpeg' })
  render(
    <BannerForm file={file} linkUrl={linkUrl} onFileChange={vi.fn()} onLinkUrl={vi.fn()} onSave={vi.fn()} saving={false} />,
  )
}

describe('BannerForm — link validado (plano 74)', () => {
  it('link inseguro: mostra o erro no campo e desabilita o salvar', () => {
    renderForm('javascript:alert(1)')

    expect(screen.getByText(/link inválido/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it.each(['', 'https://parceiro.example/promo', '/catalog'])('link "%s": sem erro e com o salvar habilitado', (link) => {
    renderForm(link)

    expect(screen.queryByText(/link inválido/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salvar/i })).toBeEnabled()
  })
})
