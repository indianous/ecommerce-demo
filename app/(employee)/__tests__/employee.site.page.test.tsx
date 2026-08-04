import { act, render, screen } from '@testing-library/react'
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

const server = setupServer(
  http.get('/api/site/settings', () =>
    HttpResponse.json({ placeholderImageUrl: 'https://cdn.example.com/placeholder.jpg' }),
  ),
  http.put('/api/site/settings/placeholder-image', () =>
    HttpResponse.json({ placeholderImageUrl: 'https://cdn.example.com/new.jpg' }),
  ),
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

  it('exibe FileUpload após carregamento', async () => {
    renderContent()
    await screen.findByRole('button', { name: /salvar/i })
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument()
  })

  it('exibe URL atual do placeholder quando cadastrada', async () => {
    renderContent()
    expect(await screen.findByAltText(/placeholder atual/i)).toBeInTheDocument()
  })

  it('não exibe imagem atual quando placeholderImageUrl é null', async () => {
    server.use(
      http.get('/api/site/settings', () => HttpResponse.json({ placeholderImageUrl: null })),
    )
    renderContent()
    await screen.findByRole('button', { name: /salvar/i })
    expect(screen.queryByAltText(/placeholder atual/i)).not.toBeInTheDocument()
  })
})

describe('SiteContent — salvar placeholder', () => {
  beforeEach(() => { useAuthStore.setState(authenticatedEmployee) })

  it('"Salvar" chama PUT e exibe toast de sucesso', async () => {
    renderContent()
    await screen.findByRole('button', { name: /salvar/i })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(fileInput, new File(['x'], 'ph.jpg', { type: 'image/jpeg' }))
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/placeholder atualizado/i)
  })

  it('botão "Salvar" fica desabilitado sem arquivo selecionado', async () => {
    renderContent()
    expect(await screen.findByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('exibe toast de erro se o PUT falhar', async () => {
    server.use(
      http.put('/api/site/settings/placeholder-image', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    )
    renderContent()
    await screen.findByRole('button', { name: /salvar/i })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(fileInput, new File(['x'], 'ph.jpg', { type: 'image/jpeg' }))
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao salvar/i)
  })
})
