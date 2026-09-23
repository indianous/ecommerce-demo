import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth.store'
import { SiteSectionPage } from '../SiteSectionPage'
import { employeeWithSite, employeeWithoutSite, signedOut } from './site-test-utils'

const replaceMock = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

beforeEach(() => replaceMock.mockClear())
afterEach(async () => {
  await act(async () => {
    useAuthStore.setState(signedOut)
  })
})

describe('SiteSectionPage', () => {
  it('sem MANAGE_SITE redireciona para /dashboard e não renderiza o conteúdo', async () => {
    await act(async () => {
      useAuthStore.setState(employeeWithoutSite)
    })

    render(
      <SiteSectionPage title="Logo da loja" backPath="/dashboard/site">
        <p>conteúdo da seção</p>
      </SiteSectionPage>,
    )

    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
    expect(screen.queryByText('conteúdo da seção')).not.toBeInTheDocument()
  })

  it('com MANAGE_SITE mostra o heading da seção, o conteúdo e o link "← Voltar" para backPath', async () => {
    await act(async () => {
      useAuthStore.setState(employeeWithSite)
    })

    render(
      <SiteSectionPage title="Logo da loja" backPath="/dashboard/admin/site">
        <p>conteúdo da seção</p>
      </SiteSectionPage>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Logo da loja' })).toBeInTheDocument()
    expect(screen.getByText('conteúdo da seção')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /voltar/i })).toHaveAttribute('href', '/dashboard/admin/site')
  })

  it('durante o carregamento mostra Skeleton (role="status") em vez do conteúdo', async () => {
    await act(async () => {
      useAuthStore.setState(employeeWithSite)
    })

    render(
      <SiteSectionPage title="Logo da loja" backPath="/dashboard/site" loading>
        <p>conteúdo da seção</p>
      </SiteSectionPage>,
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('conteúdo da seção')).not.toBeInTheDocument()
  })
})
