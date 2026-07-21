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
})
