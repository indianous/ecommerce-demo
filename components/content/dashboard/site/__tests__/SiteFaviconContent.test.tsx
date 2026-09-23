import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteFaviconContent } from '../SiteFaviconContent'
import { employeeWithSite, fullSettings, renderSection, setupSiteServer, signIn } from './site-test-utils'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))

const server = setupSiteServer()

const ico = () => new File(['icon'], 'favicon.ico', { type: 'image/vnd.microsoft.icon' })

describe('SiteFaviconContent', () => {
  beforeEach(() => signIn(employeeWithSite))

  it('mostra o favicon atual quando cadastrado e não mostra quando é null', async () => {
    const { unmount } = renderSection(<SiteFaviconContent backPath="/dashboard/site" />)
    expect(await screen.findByAltText(/favicon atual/i)).toBeInTheDocument()
    unmount()

    server.use(http.get('/api/site/settings', () => HttpResponse.json({ ...fullSettings, faviconUrl: null })))
    renderSection(<SiteFaviconContent backPath="/dashboard/site" />)
    await screen.findByRole('heading', { level: 1, name: /favicon do site/i })
    expect(screen.queryByAltText(/favicon atual/i)).not.toBeInTheDocument()
  })

  it('"Salvar favicon" fica desabilitado sem arquivo', async () => {
    renderSection(<SiteFaviconContent backPath="/dashboard/site" />)

    expect(await screen.findByRole('button', { name: /salvar favicon/i })).toBeDisabled()
  })

  it('seleciona um arquivo .ico e salva com sucesso', async () => {
    server.use(
      http.put('/api/site/settings/favicon', () =>
        HttpResponse.json({ ...fullSettings, faviconUrl: 'https://cdn.example.com/new-favicon.ico' }),
      ),
    )
    const { container } = renderSection(<SiteFaviconContent backPath="/dashboard/site" />)
    await screen.findByRole('button', { name: /salvar favicon/i })

    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, ico())
    await userEvent.click(screen.getByRole('button', { name: /salvar favicon/i }))

    expect(await screen.findByText(/favicon atualizado com sucesso/i)).toBeInTheDocument()
  })

  it('erro do backend (400, tipo inválido) mostra a mensagem real vinda do backend', async () => {
    server.use(
      http.put('/api/site/settings/favicon', () =>
        HttpResponse.json({ message: 'Tipo inválido. Envie ico, png ou svg.' }, { status: 400 }),
      ),
    )
    const { container } = renderSection(<SiteFaviconContent backPath="/dashboard/site" />)
    await screen.findByRole('button', { name: /salvar favicon/i })

    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, ico())
    await userEvent.click(screen.getByRole('button', { name: /salvar favicon/i }))

    expect(await screen.findByText(/tipo inválido/i)).toBeInTheDocument()
  })
})
