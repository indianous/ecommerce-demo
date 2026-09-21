import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteLogoContent } from '../SiteLogoContent'
import { employeeWithSite, fullSettings, renderSection, setupSiteServer, signIn } from './site-test-utils'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))

const server = setupSiteServer()

const svg = () => new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })

describe('SiteLogoContent', () => {
  beforeEach(() => signIn(employeeWithSite))

  it('mostra o heading da página e o logo atual', async () => {
    renderSection(<SiteLogoContent backPath="/dashboard/site" />)

    expect(await screen.findByRole('heading', { level: 1, name: /logo da loja/i })).toBeInTheDocument()
    expect(await screen.findByAltText(/logo atual/i)).toHaveAttribute('src', fullSettings.logoUrl)
  })

  it('sem logo cadastrado não mostra a imagem', async () => {
    server.use(http.get('/api/site/settings', () => HttpResponse.json({ ...fullSettings, logoUrl: null })))
    renderSection(<SiteLogoContent backPath="/dashboard/site" />)

    await screen.findByRole('heading', { level: 1, name: /logo da loja/i })
    expect(screen.queryByAltText(/logo atual/i)).not.toBeInTheDocument()
  })

  it('"Salvar logo" fica desabilitado sem arquivo', async () => {
    renderSection(<SiteLogoContent backPath="/dashboard/site" />)

    expect(await screen.findByRole('button', { name: /salvar logo/i })).toBeDisabled()
  })

  it('envia o arquivo por PUT, mostra toast de sucesso e atualiza o logo exibido', async () => {
    server.use(
      http.put('/api/site/settings/logo', () =>
        HttpResponse.json({ ...fullSettings, logoUrl: 'https://cdn.example.com/new-logo.svg' }),
      ),
    )
    const { container } = renderSection(<SiteLogoContent backPath="/dashboard/site" />)
    await screen.findByRole('button', { name: /salvar logo/i })

    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, svg())
    await userEvent.click(screen.getByRole('button', { name: /salvar logo/i }))

    expect(await screen.findByText(/logo atualizado com sucesso/i)).toBeInTheDocument()
    expect(screen.getByAltText(/logo atual/i)).toHaveAttribute('src', 'https://cdn.example.com/new-logo.svg')
  })

  it('exibe toast de erro se o PUT falhar', async () => {
    server.use(http.put('/api/site/settings/logo', () => HttpResponse.json({}, { status: 500 })))
    const { container } = renderSection(<SiteLogoContent backPath="/dashboard/site" />)
    await screen.findByRole('button', { name: /salvar logo/i })

    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, svg())
    await userEvent.click(screen.getByRole('button', { name: /salvar logo/i }))

    expect(await screen.findByText(/erro ao salvar logo/i)).toBeInTheDocument()
  })
})
