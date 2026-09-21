import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteContactContent } from '../SiteContactContent'
import { employeeWithSite, renderSection, setupSiteServer, signIn } from './site-test-utils'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))

const server = setupSiteServer()

describe('SiteContactContent', () => {
  beforeEach(() => signIn(employeeWithSite))

  it('carrega telefone, e-mail e descrição atuais', async () => {
    renderSection(<SiteContactContent backPath="/dashboard/site" />)

    expect(await screen.findByLabelText('Telefone')).toHaveValue('+55 11 99999-9999')
    expect(screen.getByLabelText('E-mail de contato')).toHaveValue('contato@loja.com')
    expect(screen.getByLabelText('Descrição')).toHaveValue('Fale conosco.')
  })

  it('envia por PUT o corpo { description, phone, email } e mostra toast de sucesso', async () => {
    let body: unknown
    server.use(
      http.put('/api/site/settings/contact', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({})
      }),
    )
    renderSection(<SiteContactContent backPath="/dashboard/site" />)

    await userEvent.click(await screen.findByRole('button', { name: /salvar contato/i }))

    expect(await screen.findByText(/contato atualizado com sucesso/i)).toBeInTheDocument()
    expect(body).toEqual({ description: 'Fale conosco.', phone: '+55 11 99999-9999', email: 'contato@loja.com' })
  })

  it('exibe toast de erro se o PUT falhar', async () => {
    server.use(http.put('/api/site/settings/contact', () => HttpResponse.json({}, { status: 500 })))
    renderSection(<SiteContactContent backPath="/dashboard/site" />)

    await userEvent.click(await screen.findByRole('button', { name: /salvar contato/i }))

    expect(await screen.findByText(/erro ao salvar contato/i)).toBeInTheDocument()
  })

  it('o campo Telefone avisa que o número também será usado como WhatsApp para comprovantes', async () => {
    renderSection(<SiteContactContent backPath="/dashboard/site" />)

    expect(await screen.findByText(/também será usado como whatsapp/i)).toBeInTheDocument()
    expect(screen.getByText(/comprovantes de pagamento/i)).toBeInTheDocument()
  })
})
