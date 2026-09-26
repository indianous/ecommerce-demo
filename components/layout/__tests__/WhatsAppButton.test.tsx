import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SiteSettingsContext } from '@/contexts/SiteSettingsContext'
import { WhatsAppButton } from '../WhatsAppButton'

let mockPathname = '/'
vi.mock('next/navigation', () => ({ usePathname: () => mockPathname }))

afterEach(() => {
  mockPathname = '/'
})

const baseSettings = {
  placeholderImageUrl: null,
  faviconUrl: null,
  logoUrl: null,
  instagramUrl: null,
  tiktokUrl: null,
  facebookUrl: null,
  contactPhone: null,
  navbarItems: [],
  footerColumns: [],
}

function renderButton(contactPhone: string | null, pathname = '/') {
  mockPathname = pathname
  return render(
    <SiteSettingsContext.Provider value={{ ...baseSettings, contactPhone }}>
      <WhatsAppButton />
    </SiteSettingsContext.Provider>,
  )
}

const link = () => screen.queryByRole('link', { name: 'Falar com a loja no WhatsApp' })

describe('WhatsAppButton', () => {
  it('abre a conversa com o telefone de contato, em nova aba', () => {
    renderButton('(11) 98765-4321')

    expect(link()).toHaveAttribute('href', 'https://wa.me/5511987654321')
    expect(link()).toHaveAttribute('target', '_blank')
    expect(link()).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it.each([[null], [''], ['123']])('telefone %o (vazio ou inválido) → não renderiza', (phone) => {
    renderButton(phone)
    expect(link()).not.toBeInTheDocument()
  })

  it('no /checkout não renderiza (cobriria o "Finalizar pedido" no celular)', () => {
    renderButton('(11) 98765-4321', '/checkout')
    expect(link()).not.toBeInTheDocument()
  })

  it('fica fixo no canto inferior direito', () => {
    renderButton('(11) 98765-4321')
    expect(link()!.closest('.fixed')).toHaveClass('fixed', 'bottom-4', 'right-4')
  })

  it('sem violações de acessibilidade', async () => {
    const { container } = renderButton('(11) 98765-4321')
    expect(await axe(container)).toHaveNoViolations()
  })
})
