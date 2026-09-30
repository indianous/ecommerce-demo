import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SocialLinksForm } from '../SocialLinksForm'

function renderForm(links: { instagramUrl?: string; tiktokUrl?: string; facebookUrl?: string }) {
  render(
    <SocialLinksForm
      instagramUrl={links.instagramUrl ?? ''}
      tiktokUrl={links.tiktokUrl ?? ''}
      facebookUrl={links.facebookUrl ?? ''}
      onInstagram={vi.fn()}
      onTiktok={vi.fn()}
      onFacebook={vi.fn()}
      onSave={vi.fn()}
      saving={false}
    />,
  )
}

describe('SocialLinksForm — links validados (plano 74)', () => {
  it('link sem https (instagram.com/loja): erro no campo e salvar desabilitado', () => {
    renderForm({ instagramUrl: 'instagram.com/loja' })

    expect(screen.getByText(/use um endereço começando com https:\/\//i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('javascript: no Facebook também é recusado', () => {
    renderForm({ facebookUrl: 'javascript:alert(1)' })

    expect(screen.getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('links https ou vazios: sem erro e com o salvar habilitado', () => {
    renderForm({ instagramUrl: 'https://instagram.com/loja', tiktokUrl: '' })

    expect(screen.queryByText(/use um endereço/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salvar/i })).toBeEnabled()
  })
})
