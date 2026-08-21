import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from 'base-ds'
import { AdminShell } from '../AdminShell'
import { useAuthStore } from '@/stores/auth.store'

const pushMock = vi.fn()
let mockPathname = '/dashboard/admin'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => mockPathname,
}))

const authenticatedAdmin = {
  isAuthenticated: true,
  accessToken: 'tok',
  role: 'ADMIN' as const,
  user: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' as const },
}

function renderAdminShell(pathname = '/dashboard/admin') {
  mockPathname = pathname
  return render(
    <ToastProvider>
      <AdminShell>
        <p>conteúdo da página</p>
      </AdminShell>
    </ToastProvider>,
  )
}

afterEach(async () => {
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
  pushMock.mockClear()
})

describe('AdminShell — Sidebar (desktop)', () => {
  it('renderiza nav com aria-label="Sidebar navigation", com wrapper hidden md:block', () => {
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()
    const nav = screen.getByRole('navigation', { name: /sidebar navigation/i })
    expect(nav).toBeInTheDocument()
    expect(nav.parentElement).toHaveClass('hidden', 'md:block')
  })

  it('exibe todos os itens de menu de navegação', () => {
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()
    expect(screen.getByRole('link', { name: /pedidos/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /envios/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /solicitações/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /produtos/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /estoque/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /excluídos/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /clientes/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /funcionários/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /pagamentos/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /auditoria/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /analytics/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver site/i })).toBeInTheDocument()
  })

  it('item "Ver site" aponta para "/" e abre em nova aba', () => {
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()
    const link = screen.getByRole('link', { name: /ver site/i })
    expect(link).toHaveAttribute('href', '/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('item correspondente ao pathname atual recebe aria-current="page"', () => {
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell('/dashboard/admin/orders')
    expect(screen.getByRole('link', { name: /pedidos/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /produtos/i })).not.toHaveAttribute('aria-current')
  })

  it('renderiza {children} na área de conteúdo principal', () => {
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()
    expect(screen.getByText('conteúdo da página')).toBeInTheDocument()
  })
})

describe('AdminShell — Hamburger e Drawer (mobile)', () => {
  it('renderiza botão hamburger com aria-label="Abrir menu" e classe md:hidden', () => {
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()
    const btn = screen.getByRole('button', { name: /abrir menu/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveClass('md:hidden')
  })

  it('clicar no hamburger abre o Drawer com os itens de navegação', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /pedidos/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /funcionários/i }).length).toBeGreaterThan(0)
  })

  it('item ativo no Drawer recebe aria-current="page"', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell('/dashboard/admin/employees')

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))

    const links = screen.getAllByRole('link', { name: /funcionários/i })
    expect(links.some((l) => l.getAttribute('aria-current') === 'page')).toBe(true)
  })

  it('clicar no backdrop fecha o Drawer', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByTestId('drawer-backdrop'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('pressionar Escape fecha o Drawer', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('AdminShell — Sidebar recolhível (desktop)', () => {
  it('clicar no botão de recolher esconde os rótulos dos itens (ficam sr-only)', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()

    const pedidosLink = screen.getByRole('link', { name: /pedidos/i })
    expect(pedidosLink.querySelector('span:not(.sr-only)')).toHaveTextContent('Pedidos')

    await user.click(screen.getByRole('button', { name: /toggle sidebar/i }))

    expect(pedidosLink.querySelector('span.sr-only')).toHaveTextContent('Pedidos')
  })

  it('recolher também esconde o nome no SidebarAvatar (fica sr-only)', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()

    await user.click(screen.getByRole('button', { name: /toggle sidebar/i }))

    expect(screen.getByText('Admin')).toHaveClass('sr-only')
  })
})

describe('AdminShell — Acessibilidade', () => {
  it('sem violações com Drawer fechado', async () => {
    useAuthStore.setState(authenticatedAdmin)
    const { container } = renderAdminShell()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('sem violações com Drawer aberto', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedAdmin)
    const { container } = renderAdminShell()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))

    expect(await axe(container)).toHaveNoViolations()
  })
})
