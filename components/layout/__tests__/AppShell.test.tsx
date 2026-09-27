import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Container, ToastProvider, ToastViewport, useToast } from '@indianous/base-ds'
import { AppShell } from '../AppShell'
import { SiteSettingsContext } from '@/contexts/SiteSettingsContext'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/',
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
  vi.unstubAllGlobals()
  await act(async () => {
    useNotificationsStore.getState().stopPolling()
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
          logoUrl: null,
          instagramUrl: 'https://instagram.com/loja',
          tiktokUrl: 'https://tiktok.com/@loja',
          facebookUrl: 'https://facebook.com/loja',
          contactPhone: null,
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
          logoUrl: null,
          instagramUrl: 'https://instagram.com/loja',
          tiktokUrl: null,
          facebookUrl: null,
          contactPhone: null,
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
          logoUrl: null,
          instagramUrl: null,
          tiktokUrl: null,
          facebookUrl: null,
          contactPhone: null,
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

  it('com logoUrl configurado, renderiza a imagem do logo no lugar do texto "Loja"', () => {
    render(
      <SiteSettingsContext.Provider
        value={{
          placeholderImageUrl: null,
          faviconUrl: null,
          logoUrl: 'https://cdn.example.com/logo.svg',
          instagramUrl: null,
          tiktokUrl: null,
          facebookUrl: null,
          contactPhone: null,
          navbarItems: [],
          footerColumns: [],
        }}
      >
        <AppShell>
          <p>conteúdo</p>
        </AppShell>
      </SiteSettingsContext.Provider>,
    )

    expect(screen.getByRole('img', { name: /logo da loja/i })).toHaveAttribute(
      'src',
      'https://cdn.example.com/logo.svg',
    )
    expect(screen.queryByText('Loja')).not.toBeInTheDocument()
  })

  it('com logoUrl null, continua mostrando o texto "Loja"', () => {
    render(
      <SiteSettingsContext.Provider
        value={{
          placeholderImageUrl: null,
          faviconUrl: null,
          logoUrl: null,
          instagramUrl: null,
          tiktokUrl: null,
          facebookUrl: null,
          contactPhone: null,
          navbarItems: [],
          footerColumns: [],
        }}
      >
        <AppShell>
          <p>conteúdo</p>
        </AppShell>
      </SiteSettingsContext.Provider>,
    )

    expect(screen.getByText('Loja')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /logo da loja/i })).not.toBeInTheDocument()
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

describe('AppShell — área de conteúdo', () => {
  it('com um Container como filho, existe um único landmark main', () => {
    render(
      <AppShell>
        <Container>conteúdo</Container>
      </AppShell>,
    )
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it('mostra o botão flutuante de WhatsApp, fora do <main> (plano 66, etapa 2)', () => {
    render(
      <SiteSettingsContext.Provider
        value={{
          placeholderImageUrl: null,
          faviconUrl: null,
          logoUrl: null,
          instagramUrl: null,
          tiktokUrl: null,
          facebookUrl: null,
          contactPhone: '(11) 98765-4321',
          navbarItems: [],
          footerColumns: [],
        }}
      >
        <AppShell>
          <p>conteúdo</p>
        </AppShell>
      </SiteSettingsContext.Provider>,
    )

    const whatsapp = screen.getByRole('link', { name: 'Falar com a loja no WhatsApp' })
    expect(screen.getByRole('main')).not.toContainElement(whatsapp)
  })

  it('equipe logada: a faixa "Visão do cliente" vem antes da navbar e fora do <main> (plano 66, etapa 3)', () => {
    useAuthStore.setState({ role: 'ADMIN', isAuthenticated: true, accessToken: 'tok' })
    render(
      <AppShell>
        <p>conteúdo</p>
      </AppShell>,
    )

    const banner = screen.getByRole('region', { name: 'Visão do cliente' })
    const nav = screen.getAllByRole('navigation')[0]
    expect(banner.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('main')).not.toContainElement(banner)
  })

  it('cliente logado: sem a faixa', () => {
    // cliente logado mostra o sino, que busca as notificações: sem isso o fetch com URL relativa estoura fora do teste
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ count: 0 })))
    useAuthStore.setState({ role: 'CUSTOMER', isAuthenticated: true, accessToken: 'tok' })
    render(
      <AppShell>
        <p>conteúdo</p>
      </AppShell>,
    )

    expect(screen.queryByRole('region', { name: 'Visão do cliente' })).not.toBeInTheDocument()
  })
})
