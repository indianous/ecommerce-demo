import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from 'base-ds'
import AdminLayout from '../layout'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard/admin',
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (sel: (s: object) => unknown) =>
    sel({
      isAuthenticated: true,
      accessToken: 'tok',
      role: 'ADMIN',
      user: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' },
      logout: vi.fn(),
    }),
}))

// Página que nunca termina de carregar: simula o bailout do useSearchParams no prerender
function Suspends(): never {
  throw new Promise(() => {})
}

describe('AdminLayout', () => {
  it('renderiza AdminShell como wrapper dos filhos', () => {
    render(
      <ToastProvider>
        <AdminLayout>
          <p>filho da página</p>
        </AdminLayout>
      </ToastProvider>,
    )
    expect(screen.getByRole('navigation', { name: /sidebar navigation/i })).toBeInTheDocument()
  })

  it('renderiza o children recebido', () => {
    render(
      <ToastProvider>
        <AdminLayout>
          <p>filho da página</p>
        </AdminLayout>
      </ToastProvider>,
    )
    expect(screen.getByText('filho da página')).toBeInTheDocument()
  })

  it('enquanto a página suspende, mostra o esqueleto de carregamento dentro do shell', () => {
    render(
      <ToastProvider>
        <AdminLayout>
          <Suspends />
        </AdminLayout>
      </ToastProvider>,
    )
    expect(screen.getByRole('status', { name: /carregando/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /sidebar navigation/i })).toBeInTheDocument()
  })
})
