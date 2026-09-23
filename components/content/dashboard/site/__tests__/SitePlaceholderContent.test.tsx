import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SitePlaceholderContent } from '../SitePlaceholderContent'
import { employeeWithSite, fullSettings, renderSection, setupSiteServer, signIn } from './site-test-utils'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))

const server = setupSiteServer()

const jpg = () => new File(['x'], 'ph.jpg', { type: 'image/jpeg' })

describe('SitePlaceholderContent', () => {
  beforeEach(() => signIn(employeeWithSite))

  it('mostra o placeholder atual quando cadastrado', async () => {
    renderSection(<SitePlaceholderContent backPath="/dashboard/site" />)

    expect(await screen.findByRole('heading', { level: 1, name: /placeholder de produto/i })).toBeInTheDocument()
    expect(await screen.findByAltText(/placeholder atual/i)).toBeInTheDocument()
  })

  it('não mostra a imagem quando placeholderImageUrl é null', async () => {
    server.use(http.get('/api/site/settings', () => HttpResponse.json({ ...fullSettings, placeholderImageUrl: null })))
    renderSection(<SitePlaceholderContent backPath="/dashboard/site" />)

    await screen.findByRole('heading', { level: 1, name: /placeholder de produto/i })
    expect(screen.queryByAltText(/placeholder atual/i)).not.toBeInTheDocument()
  })

  it('"Salvar placeholder" fica desabilitado sem arquivo', async () => {
    renderSection(<SitePlaceholderContent backPath="/dashboard/site" />)

    expect(await screen.findByRole('button', { name: /salvar placeholder/i })).toBeDisabled()
  })

  it('envia o arquivo por PUT e mostra toast de sucesso', async () => {
    server.use(
      http.put('/api/site/settings/placeholder-image', () =>
        HttpResponse.json({ ...fullSettings, placeholderImageUrl: 'https://cdn.example.com/new.jpg' }),
      ),
    )
    const { container } = renderSection(<SitePlaceholderContent backPath="/dashboard/site" />)
    await screen.findByRole('button', { name: /salvar placeholder/i })

    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, jpg())
    await userEvent.click(screen.getByRole('button', { name: /salvar placeholder/i }))

    expect(await screen.findByText(/placeholder atualizado com sucesso/i)).toBeInTheDocument()
  })

  it('exibe toast de erro se o PUT falhar', async () => {
    server.use(http.put('/api/site/settings/placeholder-image', () => HttpResponse.json({}, { status: 500 })))
    const { container } = renderSection(<SitePlaceholderContent backPath="/dashboard/site" />)
    await screen.findByRole('button', { name: /salvar placeholder/i })

    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, jpg())
    await userEvent.click(screen.getByRole('button', { name: /salvar placeholder/i }))

    expect(await screen.findByText(/erro ao salvar placeholder/i)).toBeInTheDocument()
  })
})
