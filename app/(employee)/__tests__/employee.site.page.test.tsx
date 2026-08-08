import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { SiteContent } from '../dashboard/site/SiteContent'
import { useAuthStore } from '@/stores/auth.store'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

const fullSettings = {
  placeholderImageUrl: 'https://cdn.example.com/placeholder.jpg',
  faviconUrl: 'https://cdn.example.com/favicon.png',
  logoUrl: 'https://cdn.example.com/logo.svg',
  siteTitle: 'Loja',
  defaultDescription: 'A melhor loja',
  aboutUsContent: '# Sobre\n\nSomos uma loja.',
  contactDescription: 'Fale conosco.',
  contactPhone: '+55 11 99999-9999',
  contactEmail: 'contato@loja.com',
  instagramUrl: 'https://instagram.com/loja',
  tiktokUrl: 'https://tiktok.com/@loja',
  facebookUrl: 'https://facebook.com/loja',
  privacyPolicyContent: 'Política de privacidade.',
  termsContent: 'Termos e condições.',
  refundPolicyContent: 'Política de reembolso.',
}

const server = setupServer(
  http.get('/api/site/settings', () => HttpResponse.json(fullSettings)),
  http.get('/api/site/banners', () => HttpResponse.json([])),
  http.put('/api/site/settings/logo', () => HttpResponse.json({ ...fullSettings, logoUrl: 'https://cdn.example.com/new-logo.svg' })),
  http.put('/api/site/settings/placeholder-image', () =>
    HttpResponse.json({ ...fullSettings, placeholderImageUrl: 'https://cdn.example.com/new.jpg' }),
  ),
  http.put('/api/site/settings/favicon', () =>
    HttpResponse.json({ ...fullSettings, faviconUrl: 'https://cdn.example.com/new-favicon.png' }),
  ),
  http.put('/api/site/settings/metadata', () => HttpResponse.json(fullSettings)),
  http.post('/api/site/banners', () => HttpResponse.json({ id: 'ban-1', imageUrl: 'https://cdn.example.com/banner.jpg', linkUrl: null, position: 1 }, { status: 201 })),
  http.delete('/api/site/banners/:id', () => new Response(null, { status: 204 })),
  http.put('/api/site/settings/about-us', () => HttpResponse.json(fullSettings)),
  http.put('/api/site/settings/contact', () => HttpResponse.json(fullSettings)),
  http.put('/api/site/settings/social-links', () => HttpResponse.json(fullSettings)),
  http.put('/api/site/settings/privacy-policy', () => HttpResponse.json(fullSettings)),
  http.put('/api/site/settings/terms', () => HttpResponse.json(fullSettings)),
  http.put('/api/site/settings/refund-policy', () => HttpResponse.json(fullSettings)),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  replaceMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

const authenticatedEmployee = {
  isAuthenticated: true,
  accessToken: 'mock-token',
  role: 'EMPLOYEE' as const,
  user: {
    id: '1',
    name: 'Func',
    email: 'func@test.com',
    role: 'EMPLOYEE' as const,
    permissions: ['MANAGE_SITE' as const],
  },
}

function renderContent() {
  return render(
    <ToastProvider>
      <SiteContent />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('SiteContent — acesso', () => {
  it('redireciona para /dashboard quando usuário não tem MANAGE_SITE', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      role: 'EMPLOYEE' as const,
      user: { id: '1', name: 'F', email: 'f@test.com', role: 'EMPLOYEE' as const, permissions: ['MANAGE_ORDERS' as const] },
    })
    await act(async () => { renderContent() })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})

describe('SiteContent — exibição', () => {
  beforeEach(() => { useAuthStore.setState(authenticatedEmployee) })

  it('exibe heading "Gestão do Site"', async () => {
    renderContent()
    expect(await screen.findByRole('heading', { name: /gestão do site/i })).toBeInTheDocument()
  })

  it('exibe Skeleton durante o carregamento', () => {
    renderContent()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('exibe seção de logo após carregamento', async () => {
    renderContent()
    expect(await screen.findByRole('region', { name: /logo da loja/i })).toBeInTheDocument()
  })

  it('exibe seção de placeholder após carregamento', async () => {
    renderContent()
    expect(await screen.findByRole('region', { name: /placeholder/i })).toBeInTheDocument()
  })

  it('exibe seção de favicon após carregamento', async () => {
    renderContent()
    expect(await screen.findByRole('region', { name: /favicon/i })).toBeInTheDocument()
  })

  it('exibe URL atual do placeholder quando cadastrada', async () => {
    renderContent()
    expect(await screen.findByAltText(/placeholder atual/i)).toBeInTheDocument()
  })

  it('exibe favicon atual quando cadastrado', async () => {
    renderContent()
    expect(await screen.findByAltText(/favicon atual/i)).toBeInTheDocument()
  })

  it('não exibe imagem placeholder quando placeholderImageUrl é null', async () => {
    server.use(
      http.get('/api/site/settings', () =>
        HttpResponse.json({ ...fullSettings, placeholderImageUrl: null, faviconUrl: null }),
      ),
    )
    renderContent()
    const placeholderSection = await screen.findByRole('region', { name: /placeholder/i })
    expect(within(placeholderSection).queryByAltText(/placeholder atual/i)).not.toBeInTheDocument()
  })

  it('não exibe favicon quando faviconUrl é null', async () => {
    server.use(
      http.get('/api/site/settings', () =>
        HttpResponse.json({ ...fullSettings, placeholderImageUrl: null, faviconUrl: null }),
      ),
    )
    renderContent()
    const faviconSection = await screen.findByRole('region', { name: /favicon/i })
    expect(within(faviconSection).queryByAltText(/favicon atual/i)).not.toBeInTheDocument()
  })

  it('exibe seção de metadados após carregamento', async () => {
    renderContent()
    expect(await screen.findByRole('region', { name: /metadados/i })).toBeInTheDocument()
  })

  it('exibe seção de banners após carregamento', async () => {
    renderContent()
    expect(await screen.findByRole('region', { name: /banners/i })).toBeInTheDocument()
  })

  it('exibe seção sobre nós após carregamento', async () => {
    renderContent()
    expect(await screen.findByRole('region', { name: /sobre nós/i })).toBeInTheDocument()
  })

  it('exibe seção de contato após carregamento', async () => {
    renderContent()
    expect(await screen.findByRole('region', { name: /contato/i })).toBeInTheDocument()
  })

  it('exibe seção de redes sociais após carregamento', async () => {
    renderContent()
    expect(await screen.findByRole('region', { name: /redes sociais/i })).toBeInTheDocument()
  })

  it('exibe seção de política de privacidade após carregamento', async () => {
    renderContent()
    expect(await screen.findByRole('region', { name: /política de privacidade/i })).toBeInTheDocument()
  })

  it('exibe seção de termos e condições após carregamento', async () => {
    renderContent()
    expect(await screen.findByRole('region', { name: /termos e condições/i })).toBeInTheDocument()
  })

  it('exibe seção de política de reembolso após carregamento', async () => {
    renderContent()
    expect(await screen.findByRole('region', { name: /política de reembolso/i })).toBeInTheDocument()
  })
})

describe('SiteContent — salvar logo', () => {
  beforeEach(() => { useAuthStore.setState(authenticatedEmployee) })

  it('"Salvar" na seção logo chama PUT e exibe toast de sucesso', async () => {
    renderContent()
    const section = await screen.findByRole('region', { name: /logo da loja/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    const fileInputEl = dialog.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(fileInputEl, new File(['<svg/>', ''], 'logo.svg', { type: 'image/svg+xml' }))
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/logo atualizado/i)
  })

  it('botão "Salvar" do logo fica desabilitado sem arquivo', async () => {
    renderContent()
    const section = await screen.findByRole('region', { name: /logo da loja/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('exibe toast de erro se o PUT do logo falhar', async () => {
    server.use(http.put('/api/site/settings/logo', () => HttpResponse.json({}, { status: 500 })))
    renderContent()
    const section = await screen.findByRole('region', { name: /logo da loja/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    const fileInputEl = dialog.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(fileInputEl, new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }))
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao salvar/i)
  })
})

describe('SiteContent — salvar placeholder', () => {
  beforeEach(() => { useAuthStore.setState(authenticatedEmployee) })

  it('"Salvar" na seção placeholder chama PUT e exibe toast de sucesso', async () => {
    renderContent()
    const section = await screen.findByRole('region', { name: /placeholder/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    const fileInputEl = dialog.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(fileInputEl, new File(['x'], 'ph.jpg', { type: 'image/jpeg' }))
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/placeholder atualizado/i)
  })

  it('botão "Salvar" do placeholder fica desabilitado sem arquivo', async () => {
    renderContent()
    const section = await screen.findByRole('region', { name: /placeholder/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('exibe toast de erro se o PUT do placeholder falhar', async () => {
    server.use(http.put('/api/site/settings/placeholder-image', () => HttpResponse.json({}, { status: 500 })))
    renderContent()
    const section = await screen.findByRole('region', { name: /placeholder/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    const fileInputEl = dialog.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(fileInputEl, new File(['x'], 'ph.jpg', { type: 'image/jpeg' }))
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao salvar/i)
  })
})

describe('SiteContent — salvar favicon', () => {
  beforeEach(() => { useAuthStore.setState(authenticatedEmployee) })

  it('"Salvar" na seção favicon chama PUT e exibe toast de sucesso', async () => {
    renderContent()
    const section = await screen.findByRole('region', { name: /favicon/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    const fileInputEl = dialog.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(fileInputEl, new File(['x'], 'fav.png', { type: 'image/png' }))
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/favicon atualizado/i)
  })

  it('botão "Salvar" do favicon fica desabilitado sem arquivo', async () => {
    renderContent()
    const section = await screen.findByRole('region', { name: /favicon/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('exibe toast de erro se o PUT do favicon falhar', async () => {
    server.use(http.put('/api/site/settings/favicon', () => HttpResponse.json({}, { status: 500 })))
    renderContent()
    const section = await screen.findByRole('region', { name: /favicon/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    const fileInputEl = dialog.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(fileInputEl, new File(['x'], 'fav.png', { type: 'image/png' }))
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao salvar/i)
  })
})

describe('SiteContent — salvar metadados', () => {
  beforeEach(() => { useAuthStore.setState(authenticatedEmployee) })

  it('"Salvar" na seção metadados chama PUT e exibe toast de sucesso', async () => {
    renderContent()
    const section = await screen.findByRole('region', { name: /metadados/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/metadados atualizados/i)
  })

  it('exibe toast de erro se o PUT dos metadados falhar', async () => {
    server.use(http.put('/api/site/settings/metadata', () => HttpResponse.json({}, { status: 500 })))
    renderContent()
    const section = await screen.findByRole('region', { name: /metadados/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao salvar/i)
  })
})

describe('SiteContent — banners', () => {
  beforeEach(() => { useAuthStore.setState(authenticatedEmployee) })

  it('botão "Salvar" de banner fica desabilitado sem arquivo', async () => {
    renderContent()
    const section = await screen.findByRole('region', { name: /banners/i })
    await userEvent.click(within(section).getByRole('button', { name: /gerenciar/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('"Salvar" na seção banners chama POST e exibe toast de sucesso', async () => {
    renderContent()
    const section = await screen.findByRole('region', { name: /banners/i })
    await userEvent.click(within(section).getByRole('button', { name: /gerenciar/i }))
    const dialog = screen.getByRole('dialog')
    const fileInputEl = dialog.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(fileInputEl, new File(['x'], 'banner.jpg', { type: 'image/jpeg' }))
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/banner adicionado/i)
  })

  it('exibe toast de erro se o POST de banner falhar', async () => {
    server.use(http.post('/api/site/banners', () => HttpResponse.json({}, { status: 500 })))
    renderContent()
    const section = await screen.findByRole('region', { name: /banners/i })
    await userEvent.click(within(section).getByRole('button', { name: /gerenciar/i }))
    const dialog = screen.getByRole('dialog')
    const fileInputEl = dialog.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(fileInputEl, new File(['x'], 'banner.jpg', { type: 'image/jpeg' }))
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao salvar/i)
  })
})

describe('SiteContent — salvar sobre nós', () => {
  beforeEach(() => { useAuthStore.setState(authenticatedEmployee) })

  it('"Salvar" na seção sobre nós chama PUT e exibe toast de sucesso', async () => {
    renderContent()
    const section = await screen.findByRole('region', { name: /sobre nós/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/sobre nós atualizado/i)
  })

  it('exibe toast de erro se o PUT de sobre nós falhar', async () => {
    server.use(http.put('/api/site/settings/about-us', () => HttpResponse.json({}, { status: 500 })))
    renderContent()
    const section = await screen.findByRole('region', { name: /sobre nós/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao salvar/i)
  })
})

describe('SiteContent — salvar contato', () => {
  beforeEach(() => { useAuthStore.setState(authenticatedEmployee) })

  it('"Salvar" na seção contato chama PUT e exibe toast de sucesso', async () => {
    renderContent()
    const section = await screen.findByRole('region', { name: /contato/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/contato atualizado/i)
  })

  it('exibe toast de erro se o PUT de contato falhar', async () => {
    server.use(http.put('/api/site/settings/contact', () => HttpResponse.json({}, { status: 500 })))
    renderContent()
    const section = await screen.findByRole('region', { name: /contato/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao salvar/i)
  })
})

describe('SiteContent — salvar redes sociais', () => {
  beforeEach(() => { useAuthStore.setState(authenticatedEmployee) })

  it('"Salvar" na seção redes sociais chama PUT e exibe toast de sucesso', async () => {
    renderContent()
    const section = await screen.findByRole('region', { name: /redes sociais/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/redes sociais atualizadas/i)
  })

  it('exibe toast de erro se o PUT de redes sociais falhar', async () => {
    server.use(http.put('/api/site/settings/social-links', () => HttpResponse.json({}, { status: 500 })))
    renderContent()
    const section = await screen.findByRole('region', { name: /redes sociais/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao salvar/i)
  })
})

describe('SiteContent — salvar política de privacidade', () => {
  beforeEach(() => { useAuthStore.setState(authenticatedEmployee) })

  it('"Salvar" na seção política de privacidade chama PUT e exibe toast de sucesso', async () => {
    renderContent()
    const section = await screen.findByRole('region', { name: /política de privacidade/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/política de privacidade atualizada/i)
  })

  it('exibe toast de erro se o PUT da política de privacidade falhar', async () => {
    server.use(http.put('/api/site/settings/privacy-policy', () => HttpResponse.json({}, { status: 500 })))
    renderContent()
    const section = await screen.findByRole('region', { name: /política de privacidade/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao salvar/i)
  })
})

describe('SiteContent — salvar termos e condições', () => {
  beforeEach(() => { useAuthStore.setState(authenticatedEmployee) })

  it('"Salvar" na seção termos e condições chama PUT e exibe toast de sucesso', async () => {
    renderContent()
    const section = await screen.findByRole('region', { name: /termos e condições/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/termos e condições atualizados/i)
  })

  it('exibe toast de erro se o PUT dos termos falhar', async () => {
    server.use(http.put('/api/site/settings/terms', () => HttpResponse.json({}, { status: 500 })))
    renderContent()
    const section = await screen.findByRole('region', { name: /termos e condições/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao salvar/i)
  })
})

describe('SiteContent — salvar política de reembolso', () => {
  beforeEach(() => { useAuthStore.setState(authenticatedEmployee) })

  it('"Salvar" na seção política de reembolso chama PUT e exibe toast de sucesso', async () => {
    renderContent()
    const section = await screen.findByRole('region', { name: /política de reembolso/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/política de reembolso atualizada/i)
  })

  it('exibe toast de erro se o PUT da política de reembolso falhar', async () => {
    server.use(http.put('/api/site/settings/refund-policy', () => HttpResponse.json({}, { status: 500 })))
    renderContent()
    const section = await screen.findByRole('region', { name: /política de reembolso/i })
    await userEvent.click(within(section).getByRole('button', { name: /editar/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao salvar/i)
  })
})
