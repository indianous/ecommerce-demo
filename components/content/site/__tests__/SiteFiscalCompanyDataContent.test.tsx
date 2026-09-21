import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteFiscalCompanyDataContent } from '../SiteFiscalCompanyDataContent'
import { emptySettings, employeeWithSite, renderSection, setupSiteServer, signIn } from './site-test-utils'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))

const server = setupSiteServer(
  http.get('/api/site/settings', () => HttpResponse.json(emptySettings)),
  http.put('/api/site/settings/fiscal-company-data', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...emptySettings, ...body })
  }),
)

describe('SiteFiscalCompanyDataContent', () => {
  beforeEach(() => signIn(employeeWithSite))

  it('carrega os dados fiscais atuais no formulário', async () => {
    server.use(
      http.get('/api/site/settings', () =>
        HttpResponse.json({ ...emptySettings, fiscalCompanyCnpj: '11444777000161', fiscalCompanyLegalName: 'Empresa Teste LTDA' }),
      ),
    )
    renderSection(<SiteFiscalCompanyDataContent backPath="/dashboard/site" />)

    expect(await screen.findByLabelText(/cnpj/i)).toHaveValue('11444777000161')
    expect(screen.getByLabelText(/razão social/i)).toHaveValue('Empresa Teste LTDA')
  })

  it('preenche e salva os dados fiscais com sucesso', async () => {
    renderSection(<SiteFiscalCompanyDataContent backPath="/dashboard/site" />)

    await userEvent.type(await screen.findByLabelText(/cnpj/i), '11444777000161')
    await userEvent.type(screen.getByLabelText(/razão social/i), 'Empresa Teste LTDA')
    await userEvent.type(screen.getByLabelText(/rua\/logradouro/i), 'Rua A')
    await userEvent.type(screen.getByLabelText(/número/i), '1')
    await userEvent.type(screen.getByLabelText(/bairro/i), 'Centro')
    await userEvent.type(screen.getByLabelText(/cidade/i), 'SP')
    await userEvent.type(screen.getByLabelText(/^estado$/i), 'SP')
    await userEvent.type(screen.getByLabelText(/cep/i), '01000000')
    await userEvent.type(screen.getByLabelText(/^e-mail$/i), 'contato@empresa.com')
    await userEvent.type(screen.getByLabelText(/^telefone$/i), '11999999999')
    await userEvent.click(screen.getByRole('button', { name: /salvar dados fiscais da empresa/i }))

    expect(await screen.findByText(/atualizados com sucesso/i)).toBeInTheDocument()
  })

  it('exibe toast de erro se o PUT falhar', async () => {
    server.use(http.put('/api/site/settings/fiscal-company-data', () => HttpResponse.json({}, { status: 500 })))
    renderSection(<SiteFiscalCompanyDataContent backPath="/dashboard/site" />)

    await userEvent.click(await screen.findByRole('button', { name: /salvar dados fiscais da empresa/i }))

    expect(await screen.findByText(/erro ao salvar dados fiscais da empresa/i)).toBeInTheDocument()
  })
})
