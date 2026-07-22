import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AuthLayout from '../layout'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/login',
}))

describe('AuthLayout', () => {
  it('renderiza o children recebido', () => {
    render(
      <AuthLayout>
        <p>conteúdo de login</p>
      </AuthLayout>,
    )
    expect(screen.getByText('conteúdo de login')).toBeInTheDocument()
  })

  it('não exibe a Navbar pública de cliente', () => {
    render(
      <AuthLayout>
        <p>conteúdo de login</p>
      </AuthLayout>,
    )
    expect(screen.queryByRole('navigation', { name: /main navigation/i })).not.toBeInTheDocument()
  })

  it('não exibe sidebar ou drawer de back-office', () => {
    render(
      <AuthLayout>
        <p>conteúdo de login</p>
      </AuthLayout>,
    )
    expect(screen.queryByRole('navigation', { name: /sidebar navigation/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /abrir menu/i })).not.toBeInTheDocument()
  })

  it('não exibe rodapé de loja', () => {
    render(
      <AuthLayout>
        <p>conteúdo de login</p>
      </AuthLayout>,
    )
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })
})
