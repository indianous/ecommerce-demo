import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteManualPaymentContent } from '../SiteManualPaymentContent'
import { employeeWithSite, fullSettings, renderSection, setupSiteServer, signIn } from './site-test-utils'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))

const server = setupSiteServer()

const png = () => new File(['x'], 'qr.png', { type: 'image/png' })

describe('SiteManualPaymentContent', () => {
  beforeEach(() => signIn(employeeWithSite))

  it('carrega a chave PIX, o favorecido e o QR Code atuais', async () => {
    renderSection(<SiteManualPaymentContent backPath="/dashboard/site" />)

    expect(await screen.findByRole('heading', { level: 1, name: /pagamento manual/i })).toBeInTheDocument()
    expect(await screen.findByLabelText(/chave pix/i)).toHaveValue('52998224725')
    expect(screen.getByLabelText(/favorecido/i)).toHaveValue('Loja do Jota')
    expect(screen.getByAltText(/qr code atual/i)).toHaveAttribute('src', fullSettings.pixQrCodeUrl)
  })

  it('salva a chave por PUT com { pixKey, holderName } e mostra toast de sucesso', async () => {
    let body: unknown
    server.use(
      http.put('/api/site/settings/pix', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ ...fullSettings, pixKey: '11144477735' })
      }),
    )
    renderSection(<SiteManualPaymentContent backPath="/dashboard/site" />)
    const key = await screen.findByLabelText(/chave pix/i)

    await userEvent.clear(key)
    await userEvent.type(key, '111.444.777-35')
    await userEvent.click(screen.getByRole('button', { name: /salvar chave pix/i }))

    expect(await screen.findByText(/chave pix atualizada com sucesso/i)).toBeInTheDocument()
    expect(body).toEqual({ pixKey: '111.444.777-35', holderName: 'Loja do Jota' })
  })

  it('erro do backend (400) mostra a mensagem real', async () => {
    server.use(
      http.put('/api/site/settings/pix', () =>
        HttpResponse.json({ message: 'Chave PIX inválida.' }, { status: 400 }),
      ),
    )
    renderSection(<SiteManualPaymentContent backPath="/dashboard/site" />)

    await userEvent.click(await screen.findByRole('button', { name: /salvar chave pix/i }))

    expect(await screen.findByText('Chave PIX inválida.')).toBeInTheDocument()
  })

  it('chave inválida digitada desabilita o salvar da chave', async () => {
    renderSection(<SiteManualPaymentContent backPath="/dashboard/site" />)
    const key = await screen.findByLabelText(/chave pix/i)

    await userEvent.clear(key)
    await userEvent.type(key, 'abc')

    expect(screen.getByRole('button', { name: /salvar chave pix/i })).toBeDisabled()
  })

  it('"Salvar QR Code" fica desabilitado sem arquivo; enviar o QR mostra a nova imagem', async () => {
    server.use(
      http.put('/api/site/settings/pix-qr-code', () =>
        HttpResponse.json({ ...fullSettings, pixQrCodeUrl: 'https://cdn.example.com/novo-qr.png' }),
      ),
    )
    const { container } = renderSection(<SiteManualPaymentContent backPath="/dashboard/site" />)
    const save = await screen.findByRole('button', { name: /salvar qr code/i })
    expect(save).toBeDisabled()

    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, png())
    await userEvent.click(screen.getByRole('button', { name: /salvar qr code/i }))

    expect(await screen.findByText(/qr code atualizado com sucesso/i)).toBeInTheDocument()
    expect(screen.getByAltText(/qr code atual/i)).toHaveAttribute('src', 'https://cdn.example.com/novo-qr.png')
  })

  it('erro ao enviar o QR Code mostra toast de erro', async () => {
    server.use(http.put('/api/site/settings/pix-qr-code', () => HttpResponse.json({}, { status: 500 })))
    const { container } = renderSection(<SiteManualPaymentContent backPath="/dashboard/site" />)
    await screen.findByRole('button', { name: /salvar qr code/i })

    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, png())
    await userEvent.click(screen.getByRole('button', { name: /salvar qr code/i }))

    expect(await screen.findByText(/erro ao salvar qr code/i)).toBeInTheDocument()
  })

  it('avisa que o telefone de contato também é o WhatsApp, com telefone, e-mail e link pra Contato', async () => {
    renderSection(<SiteManualPaymentContent backPath="/dashboard/admin/site" />)

    expect(await screen.findByText(/também será usado como whatsapp/i)).toBeInTheDocument()
    expect(screen.getByText(/\+55 11 99999-9999/)).toBeInTheDocument()
    expect(screen.getByText(/contato@loja\.com/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /contato/i })).toHaveAttribute('href', '/dashboard/admin/site/contact')
  })

  it('sem chave PIX cadastrada, avisa que os clientes só poderão pagar na retirada', async () => {
    server.use(http.get('/api/site/settings', () => HttpResponse.json({ ...fullSettings, pixKey: null, pixKeyHolder: null })))
    renderSection(<SiteManualPaymentContent backPath="/dashboard/site" />)

    expect(await screen.findByText(/sem chave pix.*só conseguem pagar na retirada/i)).toBeInTheDocument()
  })

  it('com chave PIX cadastrada, o aviso de "só retirada" não aparece', async () => {
    renderSection(<SiteManualPaymentContent backPath="/dashboard/site" />)

    await screen.findByLabelText(/chave pix/i)
    expect(screen.queryByText(/só conseguem pagar na retirada/i)).not.toBeInTheDocument()
  })
})
