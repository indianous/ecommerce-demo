import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SitePaymentGatewayContent } from '../SitePaymentGatewayContent'
import { employeeWithSite, gatewayConfig, renderSection, setupSiteServer, signIn } from './site-test-utils'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))

const server = setupSiteServer(
  http.put('/api/site/payment-gateway', async ({ request }) => {
    const body = (await request.json()) as { provider: string }
    return HttpResponse.json({ ...gatewayConfig, active: body.provider })
  }),
)

describe('SitePaymentGatewayContent', () => {
  beforeEach(() => signIn(employeeWithSite))

  it('busca o gateway ativo e mostra os providers, com o ativo marcado', async () => {
    renderSection(<SitePaymentGatewayContent backPath="/dashboard/site" />)

    expect(await screen.findByRole('heading', { level: 1, name: /gateway de pagamento/i })).toBeInTheDocument()
    expect(await screen.findByRole('radio', { name: /pagamento manual/i })).toBeChecked()
  })

  it('troca de gateway e salva com sucesso', async () => {
    renderSection(<SitePaymentGatewayContent backPath="/dashboard/site" />)

    await userEvent.click(await screen.findByRole('radio', { name: /stripe/i }))
    await userEvent.click(screen.getByRole('button', { name: /salvar gateway de pagamento/i }))

    expect(await screen.findByText(/gateway de pagamento atualizado com sucesso/i)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /stripe/i })).toBeChecked()
  })

  it('provider não configurado: mostra o erro do backend (409) e mantém o gateway anterior selecionado', async () => {
    server.use(
      http.put('/api/site/payment-gateway', () =>
        HttpResponse.json({ message: 'Gateway STRIPE não está configurado no servidor' }, { status: 409 }),
      ),
    )
    renderSection(<SitePaymentGatewayContent backPath="/dashboard/site" />)

    await userEvent.click(await screen.findByRole('radio', { name: /stripe/i }))
    await userEvent.click(screen.getByRole('button', { name: /salvar gateway de pagamento/i }))

    await screen.findAllByText(/não está configurado/i)
    expect(screen.getByRole('radio', { name: /pagamento manual/i })).toBeChecked()
  })
})
