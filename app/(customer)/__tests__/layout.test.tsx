import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@indianous/base-ds'
import CustomerLayout from '../layout'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/cart',
}))

const storeState = {
  isAuthenticated: false,
  accessToken: null,
  role: null,
  user: null,
  logout: vi.fn(),
}

vi.mock('@/stores/auth.store', () => ({
  // UserMenu calls useAuthStore() without selector; other components pass a selector
  useAuthStore: (sel?: (s: object) => unknown) => (sel ? sel(storeState) : storeState),
}))

// Página que nunca termina de carregar: simula o bailout do useSearchParams no prerender
function Suspends(): never {
  throw new Promise(() => {})
}

describe('CustomerLayout', () => {
  it('renderiza a Navbar pública de cliente', () => {
    render(
      <ToastProvider>
        <CustomerLayout>
          <p>filho da página</p>
        </CustomerLayout>
      </ToastProvider>,
    )
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })

  it('renderiza o children recebido', () => {
    render(
      <ToastProvider>
        <CustomerLayout>
          <p>filho da página</p>
        </CustomerLayout>
      </ToastProvider>,
    )
    expect(screen.getByText('filho da página')).toBeInTheDocument()
  })

  it('renderiza o rodapé', () => {
    render(
      <ToastProvider>
        <CustomerLayout>
          <p>filho da página</p>
        </CustomerLayout>
      </ToastProvider>,
    )
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('não exibe sidebar ou drawer de back-office', () => {
    render(
      <ToastProvider>
        <CustomerLayout>
          <p>filho da página</p>
        </CustomerLayout>
      </ToastProvider>,
    )
    expect(screen.queryByRole('navigation', { name: /sidebar navigation/i })).not.toBeInTheDocument()
  })

  it('enquanto a página suspende, mostra o esqueleto de carregamento e mantém a Navbar', () => {
    render(
      <ToastProvider>
        <CustomerLayout>
          <Suspends />
        </CustomerLayout>
      </ToastProvider>,
    )
    expect(screen.getByRole('status', { name: /carregando/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })
})
