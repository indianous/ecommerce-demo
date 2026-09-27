import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@indianous/base-ds'
import CustomerLayout from '../layout'
import CustomerNotFound from '../not-found'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/orders/pedido-inexistente',
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

function renderNotFound() {
  return render(
    <ToastProvider>
      <CustomerLayout>
        <CustomerNotFound />
      </CustomerLayout>
    </ToastProvider>,
  )
}

describe('(customer) not-found', () => {
  it('renderiza apenas uma navegação principal (sem duplicar o AppShell)', () => {
    renderNotFound()
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })

  it('renderiza apenas um rodapé', () => {
    renderNotFound()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('renderiza o heading de página não encontrada', () => {
    renderNotFound()
    expect(screen.getByRole('heading', { level: 1, name: /página não encontrada/i })).toBeInTheDocument()
  })

  it('linka de volta para o início', () => {
    renderNotFound()
    expect(screen.getByRole('link', { name: /voltar para o início/i })).toHaveAttribute('href', '/')
  })
})
