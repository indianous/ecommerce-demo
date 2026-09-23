import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Container, ToastProvider } from 'base-ds'
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
  user: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' as const , permissions: [], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
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
    expect(screen.getByRole('link', { name: /^categorias$/i })).toHaveAttribute('href', '/dashboard/admin/categories')
    expect(screen.getByRole('link', { name: /^promoções$/i })).toHaveAttribute('href', '/dashboard/admin/promotions')
    expect(screen.getByRole('link', { name: /estoque/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /excluídos/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /clientes/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /funcionários/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /administradores/i })).toBeInTheDocument()
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

describe('AdminShell — Grupos de navegação', () => {
  it('cabeçalhos de grupo aparecem na sidebar desktop, na ordem esperada', () => {
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()
    const headers = ['Vendas', 'Catálogo', 'Pessoas', 'Site', 'Sistema'].map((label) => screen.getByText(label))
    const nav = screen.getByRole('navigation', { name: /sidebar navigation/i })
    const positions = headers.map((h) => Array.from(nav.querySelectorAll('li')).indexOf(h.closest('li')!))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('ordem no DOM respeita grupo → itens do grupo', () => {
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()
    const nav = screen.getByRole('navigation', { name: /sidebar navigation/i })
    const items = Array.from(nav.querySelectorAll('li')).map((li) => li.textContent?.trim())
    const vendasIndex = items.indexOf('Vendas')
    const pedidosIndex = items.findIndex((t) => t?.includes('Pedidos'))
    const catalogoIndex = items.indexOf('Catálogo')
    expect(vendasIndex).toBeLessThan(pedidosIndex)
    expect(pedidosIndex).toBeLessThan(catalogoIndex)
  })

  it('"Ver site" renderiza fora de qualquer grupo', () => {
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()
    const link = screen.getByRole('link', { name: /ver site/i })
    expect(link.closest('li')?.previousElementSibling?.textContent).not.toBe('Sistema')
  })

  it('item ativo de "Vendas" continua recebendo aria-current="page"', () => {
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell('/dashboard/admin/orders')
    expect(screen.getByRole('link', { name: /pedidos/i })).toHaveAttribute('aria-current', 'page')
  })

  it('item ativo de "Pessoas" continua recebendo aria-current="page"', () => {
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell('/dashboard/admin/customers')
    expect(screen.getByRole('link', { name: /clientes/i })).toHaveAttribute('aria-current', 'page')
  })

  it('modo colapsado esconde o texto do cabeçalho de grupo (sr-only)', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()

    await user.click(screen.getByRole('button', { name: /toggle sidebar/i }))

    expect(screen.getByText('Vendas')).toHaveClass('sr-only')
  })

  it('drawer mobile mostra a mesma estrutura de grupos que o desktop', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Vendas')).toBeInTheDocument()
    expect(within(dialog).getByText('Catálogo')).toBeInTheDocument()
    expect(within(dialog).getByText('Pessoas')).toBeInTheDocument()
    expect(within(dialog).getByText('Site')).toBeInTheDocument()
    expect(within(dialog).getByText('Sistema')).toBeInTheDocument()
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

const ADMIN_SITE_LINKS: [RegExp, string][] = [
  [/^visão geral$/i, '/dashboard/admin/site'],
  [/^logo$/i, '/dashboard/admin/site/logo'],
  [/^placeholder$/i, '/dashboard/admin/site/placeholder-image'],
  [/^favicon$/i, '/dashboard/admin/site/favicon'],
  [/^metadados$/i, '/dashboard/admin/site/metadata'],
  [/^banners$/i, '/dashboard/admin/site/banners'],
  [/^sobre nós$/i, '/dashboard/admin/site/about-us'],
  [/^contato$/i, '/dashboard/admin/site/contact'],
  [/^redes sociais$/i, '/dashboard/admin/site/social-links'],
  [/^privacidade$/i, '/dashboard/admin/site/privacy-policy'],
  [/^termos e condições$/i, '/dashboard/admin/site/terms'],
  [/^reembolso$/i, '/dashboard/admin/site/refund-policy'],
  [/^navegação$/i, '/dashboard/admin/site/navigation'],
  [/^centros de distribuição$/i, '/dashboard/admin/site/distribution-centers'],
  [/^gateway de pagamento$/i, '/dashboard/admin/site/payment-gateway'],
  [/^pagamento manual$/i, '/dashboard/admin/site/manual-payment'],
  [/^dados fiscais$/i, '/dashboard/admin/site/fiscal-company-data'],
  [/^melhor envio$/i, '/dashboard/admin/site/melhor-envio'],
]

describe('AdminShell — Menu do site', () => {
  it('lista "Visão geral" e as 17 páginas do site com o prefixo /dashboard/admin/site', () => {
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()
    ADMIN_SITE_LINKS.forEach(([name, href]) => {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href)
    })
  })

  it('as páginas do site ficam sob um único cabeçalho "Site"; "Sistema" fica só com Auditoria e Analytics', () => {
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()
    const nav = screen.getByRole('navigation', { name: /sidebar navigation/i })
    const rows = Array.from(nav.querySelectorAll('li')).map((li) => li.textContent?.trim())
    expect(rows.filter((t) => t === 'Site')).toHaveLength(1)
    expect(rows.filter((t) => t === 'Sistema')).toHaveLength(1)
    const sistema = rows.indexOf('Sistema')
    expect(rows.slice(sistema + 1, sistema + 3).map((t) => t?.toLowerCase())).toEqual(['auditoria', 'analytics'])
    expect(rows[rows.indexOf('Site') + 1]).toBe('Visão geral')
  })

  it('em /dashboard/admin/site/logo só "Logo" fica ativo — "Visão geral" não', () => {
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell('/dashboard/admin/site/logo')
    expect(screen.getByRole('link', { name: /^logo$/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /^visão geral$/i })).not.toHaveAttribute('aria-current')
  })

  it('em /dashboard/admin/site/navigation o item "Navegação" fica ativo', () => {
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell('/dashboard/admin/site/navigation')
    expect(screen.getByRole('link', { name: /^navegação$/i })).toHaveAttribute('aria-current', 'page')
  })

  it('o menu longo rola: wrapper da sidebar e drawer têm overflow-y-auto', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()
    const nav = screen.getByRole('navigation', { name: /sidebar navigation/i })
    expect(nav.parentElement).toHaveClass('overflow-y-auto')

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))
    expect(screen.getByRole('dialog')).toHaveClass('overflow-y-auto')
  })
})

describe('AdminShell — área de conteúdo', () => {
  it('o <main> do shell não tem padding próprio (o espaçamento é do Container da página)', () => {
    useAuthStore.setState(authenticatedAdmin)
    renderAdminShell()
    expect(screen.getByRole('main')).not.toHaveClass('p-6')
  })

  it('com um Container como filho, existe um único landmark main', () => {
    useAuthStore.setState(authenticatedAdmin)
    render(
      <ToastProvider>
        <AdminShell>
          <Container>conteúdo</Container>
        </AdminShell>
      </ToastProvider>,
    )
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })
})
