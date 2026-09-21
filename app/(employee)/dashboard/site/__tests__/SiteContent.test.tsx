import { act, render, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from 'base-ds'
import { SiteContent } from '@/components/content/SiteContent'
import { SITE_HUB_GROUPS, SITE_SECTIONS, SITE_STANDALONE_PAGES } from '@/lib/site-sections'
import {
  emptySettings,
  employeeWithSite,
  employeeWithoutSite,
  setupSiteServer,
  signIn,
} from '@/components/content/site/__tests__/site-test-utils'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

const server = setupSiteServer()

const allPages = [...SITE_SECTIONS, ...SITE_STANDALONE_PAGES]

function renderHub(basePath?: string) {
  return render(
    <ToastProvider>
      <SiteContent {...(basePath ? { basePath } : {})} />
    </ToastProvider>,
  )
}

describe('SiteContent — índice da gestão do site', () => {
  it('sem MANAGE_SITE: nada da gestão aparece', async () => {
    await signIn(employeeWithoutSite)
    await act(async () => { renderHub() })

    expect(screen.queryByRole('heading', { name: /gestão do site/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /gerenciar/i })).not.toBeInTheDocument()
  })

  it('exibe o heading "Gestão do Site" e o Skeleton durante o carregamento', async () => {
    await signIn(employeeWithSite)
    renderHub()

    expect(await screen.findByRole('heading', { level: 1, name: /gestão do site/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('agrupa os cards em Identidade visual, Conteúdo institucional, Loja e Pagamento e integrações', async () => {
    await signIn(employeeWithSite)
    renderHub()

    for (const group of Object.values(SITE_HUB_GROUPS)) {
      expect(await screen.findByRole('heading', { level: 2, name: group })).toBeInTheDocument()
    }
  })

  it('tem um card por página (15 seções + navegação + centros), cada um com link "Gerenciar" para /dashboard/site/<slug>', async () => {
    await signIn(employeeWithSite)
    renderHub()

    expect(allPages).toHaveLength(17)
    for (const page of allPages) {
      const card = (await screen.findByRole('heading', { level: 3, name: page.title })).closest('section') as HTMLElement
      expect(within(card).getByRole('link', { name: `Gerenciar ${page.title}` })).toHaveAttribute(
        'href',
        `/dashboard/site/${page.slug}`,
      )
    }
  })

  it('com basePath admin os links usam o prefixo /dashboard/admin/site', async () => {
    await signIn(employeeWithSite)
    renderHub('/dashboard/admin/site')

    expect(await screen.findByRole('link', { name: /gerenciar navegação do site/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/site/navigation',
    )
    expect(screen.getByRole('link', { name: /gerenciar logo da loja/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/site/logo',
    )
  })

  it('mostra "Configurado" nas seções preenchidas e "Não configurado" nas vazias', async () => {
    await signIn(employeeWithSite)
    renderHub()

    const logo = (await screen.findByRole('heading', { level: 3, name: 'Logo da loja' })).closest('section') as HTMLElement
    expect(within(logo).getByText('Configurado')).toBeInTheDocument()
  })

  it('seção vazia mostra "Não configurado"', async () => {
    server.use(http.get('/api/site/settings', () => HttpResponse.json(emptySettings)))
    await signIn(employeeWithSite)
    renderHub()

    const logo = (await screen.findByRole('heading', { level: 3, name: 'Logo da loja' })).closest('section') as HTMLElement
    expect(within(logo).getByText('Não configurado')).toBeInTheDocument()
  })

  it('banners, gateway e Melhor Envio não mostram status (não dependem de /api/site/settings)', async () => {
    await signIn(employeeWithSite)
    renderHub()

    for (const title of ['Banners', 'Gateway de pagamento', 'Melhor Envio']) {
      const card = (await screen.findByRole('heading', { level: 3, name: title })).closest('section') as HTMLElement
      expect(within(card).queryByText(/configurado/i)).not.toBeInTheDocument()
    }
  })

  it('não abre Dialog nenhum: a tela deixou de editar', async () => {
    await signIn(employeeWithSite)
    renderHub()
    await screen.findByRole('heading', { level: 1, name: /gestão do site/i })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^editar/i })).not.toBeInTheDocument()
  })
})
