import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useToast } from 'base-ds'
import { AppShell } from '../AppShell'
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

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
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

  it('lets descendants trigger toasts that render through the mounted ToastViewport', async () => {
    const user = userEvent.setup()
    render(
      <AppShell>
        <ToastTrigger />
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: /disparar toast/i }))

    expect(await screen.findByText('Pedido criado')).toBeInTheDocument()
  })
})
