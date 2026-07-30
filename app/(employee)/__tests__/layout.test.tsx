import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from 'base-ds'
import EmployeeLayout from '../layout'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard',
}))

const mockAuthState = {
  isAuthenticated: true,
  accessToken: 'tok',
  role: 'EMPLOYEE' as const,
  user: {
    id: '2',
    name: 'Funcionário',
    email: 'employee@test.com',
    role: 'EMPLOYEE' as const,
    permissions: [] as import('@/types').EmployeePermission[],
  },
  logout: vi.fn(),
}

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (sel?: (s: object) => unknown) =>
    sel ? sel(mockAuthState) : mockAuthState,
}))

describe('EmployeeLayout', () => {
  it('renderiza EmployeeShell como wrapper dos filhos', () => {
    render(
      <ToastProvider>
        <EmployeeLayout>
          <p>filho da página</p>
        </EmployeeLayout>
      </ToastProvider>,
    )
    expect(screen.getByRole('navigation', { name: /sidebar navigation/i })).toBeInTheDocument()
  })

  it('renderiza o children recebido', () => {
    render(
      <ToastProvider>
        <EmployeeLayout>
          <p>filho da página</p>
        </EmployeeLayout>
      </ToastProvider>,
    )
    expect(screen.getByText('filho da página')).toBeInTheDocument()
  })

  it('não exibe a Navbar pública de cliente', () => {
    render(
      <ToastProvider>
        <EmployeeLayout>
          <p>filho da página</p>
        </EmployeeLayout>
      </ToastProvider>,
    )
    expect(screen.queryByRole('navigation', { name: /main navigation/i })).not.toBeInTheDocument()
  })
})
