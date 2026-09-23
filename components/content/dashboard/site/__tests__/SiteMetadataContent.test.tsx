import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteMetadataContent } from '../SiteMetadataContent'
import { employeeWithSite, renderSection, setupSiteServer, signIn } from './site-test-utils'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))

const server = setupSiteServer()

describe('SiteMetadataContent', () => {
  beforeEach(() => signIn(employeeWithSite))

  it('carrega o valor atual no formulário', async () => {
    renderSection(<SiteMetadataContent backPath="/dashboard/site" />)

    expect(await screen.findByLabelText('Nome da loja')).toHaveValue('Loja')
    expect(screen.getByLabelText('Descrição padrão')).toHaveValue('A melhor loja')
  })

  it('envia os valores editados por PUT e mostra toast de sucesso', async () => {
    let body: unknown
    server.use(
      http.put('/api/site/settings/metadata', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({})
      }),
    )
    renderSection(<SiteMetadataContent backPath="/dashboard/site" />)
    const title = await screen.findByLabelText('Nome da loja')

    await userEvent.clear(title)
    await userEvent.type(title, 'Nova Loja')
    await userEvent.click(screen.getByRole('button', { name: /salvar metadados/i }))

    expect(await screen.findByText(/metadados atualizados com sucesso/i)).toBeInTheDocument()
    expect(body).toEqual({ siteTitle: 'Nova Loja', defaultDescription: 'A melhor loja' })
  })

  it('exibe toast de erro se o PUT falhar', async () => {
    server.use(http.put('/api/site/settings/metadata', () => HttpResponse.json({}, { status: 500 })))
    renderSection(<SiteMetadataContent backPath="/dashboard/site" />)

    await userEvent.click(await screen.findByRole('button', { name: /salvar metadados/i }))

    expect(await screen.findByText(/erro ao salvar metadados/i)).toBeInTheDocument()
  })
})
