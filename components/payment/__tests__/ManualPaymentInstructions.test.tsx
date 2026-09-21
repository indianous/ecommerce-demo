import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ManualPaymentInstructions } from '../ManualPaymentInstructions'
import type { DistributionCenter, OrderResponse } from '@/types'

const settings = {
  contactEmail: 'contato@loja.com',
  contactPhone: '+55 11 99999-9999',
  pixKey: '52998224725',
  pixKeyHolder: 'Loja do Jota',
  pixQrCodeUrl: 'https://cdn.example.com/qr.png',
}

const server = setupServer(http.get('/api/site/settings', () => HttpResponse.json(settings)))
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const center: DistributionCenter = {
  id: 'dc-1', name: 'CD Zona Sul', street: 'Av. das Nações', number: '1000', district: 'Centro',
  city: 'São Paulo', state: 'SP', zipCode: '01310100', active: true,
}

const pixOrder: Pick<OrderResponse, 'paymentMethod' | 'paymentStatus' | 'paymentId' | 'checkoutUrl' | 'totalAmount' | 'pickupLocation'> = {
  paymentMethod: 'PIX', paymentStatus: 'PENDING', totalAmount: 2999,
}

const pickupOrder = { ...pixOrder, paymentMethod: 'PAY_ON_PICKUP' as const, pickupLocation: center }

function useSettings(patch: Record<string, unknown>) {
  server.use(http.get('/api/site/settings', () => HttpResponse.json({ ...settings, ...patch })))
}

describe('ManualPaymentInstructions — PIX', () => {
  it('mostra a chave, o favorecido, o QR Code (imagem), o total e o botão de copiar', async () => {
    render(<ManualPaymentInstructions order={pixOrder} />)

    expect(await screen.findByText('52998224725')).toBeInTheDocument()
    expect(screen.getByText(/Loja do Jota/)).toBeInTheDocument()
    expect(screen.getByAltText(/qr code do pix/i)).toHaveAttribute('src', 'https://cdn.example.com/qr.png')
    expect(screen.getByText(/R\$\s?2\.999,00/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copiar/i })).toBeInTheDocument()
  })

  it('sem QR Code enviado, mostra só a chave', async () => {
    useSettings({ pixQrCodeUrl: null })
    render(<ManualPaymentInstructions order={pixOrder} />)

    expect(await screen.findByText('52998224725')).toBeInTheDocument()
    expect(screen.queryByAltText(/qr code do pix/i)).not.toBeInTheDocument()
  })

  it('pede o comprovante por e-mail ou WhatsApp, com os links do e-mail e do telefone de contato', async () => {
    render(<ManualPaymentInstructions order={pixOrder} />)

    expect(await screen.findByText(/envie o comprovante/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /contato@loja\.com/i })).toHaveAttribute('href', 'mailto:contato@loja.com')
    expect(screen.getByRole('link', { name: /whatsapp/i })).toHaveAttribute('href', 'https://wa.me/5511999999999')
  })

  it('só e-mail cadastrado: oferece só o e-mail', async () => {
    useSettings({ contactPhone: null })
    render(<ManualPaymentInstructions order={pixOrder} />)

    expect(await screen.findByRole('link', { name: /contato@loja\.com/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /whatsapp/i })).not.toBeInTheDocument()
  })

  it('só telefone cadastrado: oferece só o WhatsApp', async () => {
    useSettings({ contactEmail: null })
    render(<ManualPaymentInstructions order={pixOrder} />)

    expect(await screen.findByRole('link', { name: /whatsapp/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /mailto|@/i })).not.toBeInTheDocument()
  })

  it('nenhum contato cadastrado: manda entrar em contato com a loja', async () => {
    useSettings({ contactEmail: null, contactPhone: null })
    render(<ManualPaymentInstructions order={pixOrder} />)

    expect(await screen.findByText(/entre em contato com a loja/i)).toBeInTheDocument()
  })

  it('pedido PIX que já tem paymentId (Stripe/PagSeguro) não mostra as instruções manuais', async () => {
    const { container } = render(<ManualPaymentInstructions order={{ ...pixOrder, paymentId: 'cs_123' }} />)

    await new Promise((r) => setTimeout(r, 50))
    expect(container).toBeEmptyDOMElement()
  })
})

describe('ManualPaymentInstructions — pagar na retirada', () => {
  it('mostra o local de retirada e não pede comprovante', async () => {
    render(<ManualPaymentInstructions order={pickupOrder} />)

    expect(await screen.findByText(/pague na retirada em CD Zona Sul/i)).toBeInTheDocument()
    expect(screen.getByText(/Av\. das Nações, 1000/)).toBeInTheDocument()
    expect(screen.queryByText(/comprovante/i)).not.toBeInTheDocument()
  })
})

describe('ManualPaymentInstructions — pagamento já resolvido', () => {
  it.each(['PAID', 'FAILED', 'REFUNDED'] as const)('pagamento %s não mostra as instruções', async (paymentStatus) => {
    const { container } = render(<ManualPaymentInstructions order={{ ...pixOrder, paymentStatus }} />)

    await new Promise((r) => setTimeout(r, 50))
    expect(container).toBeEmptyDOMElement()
  })
})
