import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport, useToast } from 'base-ds'
import { AppShell } from '../AppShell'
import { SiteSettingsContext } from '@/contexts/SiteSettingsContext'
import { useAuthStore } from '@/stores/auth.store'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

function ToastTrigger() {
  const { toast } = useToast()
  return (
    <button onClick={() => toast({ title: 'Pedido criado', variant: 'success' })}>
      Disparar toast
    </button>
  )
}

afterEach(async () => {
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
  pushMock.mockClear()
})

describe('AppShell', () => {
  it('renders the main navigation', () => {
    render(
      <AppShell>
        <p>conteúdo</p>
      </AppShell>,
    )
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })

  it('renders a search form in the navbar', () => {
    render(
      <AppShell>
        <p>conteúdo</p>
      </AppShell>,
    )
    expect(screen.getByRole('search')).toBeInTheDocument()
  })

  it('renders a login link when unauthenticated', () => {
    render(
      <AppShell>
        <p>conteúdo</p>
      </AppShell>,
    )
    // Navbar renders actions in both desktop and mobile slots; both are in the DOM in jsdom
    const links = screen.getAllByRole('link', { name: /entrar/i })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', '/login')
  })

  it('renders the cart drawer trigger', () => {
    render(
      <AppShell>
        <p>conteúdo</p>
      </AppShell>,
    )
    // Navbar renders actions in both desktop and mobile slots; both are in the DOM in jsdom
    const triggers = screen.getAllByRole('button', { name: /carrinho/i })
    expect(triggers.length).toBeGreaterThan(0)
  })

  it('renders the footer landmark', () => {
    render(
      <AppShell>
        <p>conteúdo</p>
      </AppShell>,
    )
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('renders page children', () => {
    render(
      <AppShell>
        <p>conteúdo da página</p>
      </AppShell>,
    )
    expect(screen.getByText('conteúdo da página')).toBeInTheDocument()
  })

  it('não exibe links de redes sociais quando todos os URLs são null', () => {
    render(
      <AppShell>
        <p>conteúdo</p>
      </AppShell>,
    )
    expect(screen.queryByRole('link', { name: /instagram/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /tiktok/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /facebook/i })).not.toBeInTheDocument()
  })

  it('exibe links das redes sociais configuradas no contexto', () => {
    render(
      <SiteSettingsContext.Provider
        value={{
          placeholderImageUrl: null,
          faviconUrl: null,
          instagramUrl: 'https://instagram.com/loja',
          tiktokUrl: 'https://tiktok.com/@loja',
          facebookUrl: 'https://facebook.com/loja',
          navbarItems: [],
          footerColumns: [],
        }}
      >
        <AppShell>
          <p>conteúdo</p>
        </AppShell>
      </SiteSettingsContext.Provider>,
    )
    expect(screen.getByRole('link', { name: /instagram/i })).toHaveAttribute('href', 'https://instagram.com/loja')
    expect(screen.getByRole('link', { name: /tiktok/i })).toHaveAttribute('href', 'https://tiktok.com/@loja')
    expect(screen.getByRole('link', { name: /facebook/i })).toHaveAttribute('href', 'https://facebook.com/loja')
  })

  it('exibe apenas os links cujo URL está configurado', () => {
    render(
      <SiteSettingsContext.Provider
        value={{
          placeholderImageUrl: null,
          faviconUrl: null,
          instagramUrl: 'https://instagram.com/loja',
          tiktokUrl: null,
          facebookUrl: null,
          navbarItems: [],
          footerColumns: [],
        }}
      >
        <AppShell>
          <p>conteúdo</p>
        </AppShell>
      </SiteSettingsContext.Provider>,
    )
    expect(screen.getByRole('link', { name: /instagram/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /tiktok/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /facebook/i })).not.toBeInTheDocument()
  })

  it('com navbarItems/footerColumns do contexto preenchidos, Navbar recebe items e Footer recebe columns', () => {
    render(
      <SiteSettingsContext.Provider
        value={{
          placeholderImageUrl: null,
          faviconUrl: null,
          instagramUrl: null,
          tiktokUrl: null,
          facebookUrl: null,
          navbarItems: [{ type: 'link', label: 'Catálogo', href: '/catalog' }],
          footerColumns: [{ title: 'Institucional', links: [{ label: 'Sobre nós', href: '/about-us' }] }],
        }}
      >
        <AppShell>
          <p>conteúdo</p>
        </AppShell>
      </SiteSettingsContext.Provider>,
    )

    expect(screen.getAllByRole('link', { name: 'Catálogo' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('navigation', { name: 'Institucional' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sobre nós' })).toHaveAttribute('href', '/about-us')
  })

  it('lets descendants trigger toasts that render through the mounted ToastViewport', async () => {
    const user = userEvent.setup()
    // AppShell no longer owns ToastProvider/ToastViewport — they come from RootProviders
    render(
      <ToastProvider>
        <AppShell>
          <ToastTrigger />
        </AppShell>
        <ToastViewport />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: /disparar toast/i }))

    expect(await screen.findByText('Pedido criado')).toBeInTheDocument()
  })
})
