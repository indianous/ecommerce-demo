import { act, render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { afterEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/stores/auth.store'
import type { UserRole } from '@/types'
import { StaffPreviewBanner } from '../StaffPreviewBanner'

afterEach(async () => {
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})

function renderAs(role: UserRole | null) {
  useAuthStore.setState({ role, isAuthenticated: role !== null, accessToken: role ? 'tok' : null })
  return render(<StaffPreviewBanner />)
}

const banner = () => screen.queryByRole('region', { name: 'Visão do cliente' })

describe('StaffPreviewBanner', () => {
  it('ADMIN → faixa com o aviso e "Voltar ao painel" para /dashboard/admin', () => {
    renderAs('ADMIN')

    expect(banner()).toHaveTextContent('Você está vendo a loja como um cliente')
    expect(screen.getByRole('link', { name: 'Voltar ao painel' })).toHaveAttribute('href', '/dashboard/admin')
  })

  it('EMPLOYEE → "Voltar ao painel" para /dashboard', () => {
    renderAs('EMPLOYEE')

    expect(screen.getByRole('link', { name: 'Voltar ao painel' })).toHaveAttribute('href', '/dashboard')
  })

  it.each([['CUSTOMER' as const], [null]])('role %o (cliente, visitante ou sessão ainda não hidratada) → não renderiza', (role) => {
    renderAs(role)

    expect(banner()).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Voltar ao painel' })).not.toBeInTheDocument()
  })

  it('sem violações de acessibilidade', async () => {
    const { container } = renderAs('ADMIN')
    expect(await axe(container)).toHaveNoViolations()
  })
})
