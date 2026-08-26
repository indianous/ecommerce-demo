import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ShippingPreview } from '../ShippingPreview'
import { useAuthStore } from '@/stores/auth.store'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

describe('ShippingPreview — cliente não autenticado', () => {
  it('renderiza o campo de CEP e o botão "Calcular frete"', () => {
    render(<ShippingPreview productId="prod-1" />)

    expect(screen.getByLabelText(/^cep$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /calcular frete/i })).toBeInTheDocument()
  })

  it('CEP com formato inválido mostra erro e não chama a API', async () => {
    let called = false
    server.use(
      http.post('/api/catalog/products/prod-1/shipping-preview', () => {
        called = true
        return HttpResponse.json({ options: [], freeShipping: false })
      }),
    )
    const user = userEvent.setup()
    render(<ShippingPreview productId="prod-1" />)

    await user.type(screen.getByLabelText(/^cep$/i), '123')
    await user.click(screen.getByRole('button', { name: /calcular frete/i }))

    expect(await screen.findByText(/cep inválido/i)).toBeInTheDocument()
    expect(called).toBe(false)
  })

  it('CEP válido mostra as opções de frete devolvidas pela API', async () => {
    server.use(
      http.post('/api/catalog/products/prod-1/shipping-preview', async ({ request }) => {
        const body = (await request.json()) as { zipCode: string }
        expect(body.zipCode).toBe('20040-020')
        return HttpResponse.json({
          freeShipping: false,
          options: [{ serviceId: '4', carrierName: 'Jadlog', serviceName: '.Com', price: 17.36, deliveryDays: 3 }],
        })
      }),
    )
    const user = userEvent.setup()
    render(<ShippingPreview productId="prod-1" />)

    await user.type(screen.getByLabelText(/^cep$/i), '20040-020')
    await user.click(screen.getByRole('button', { name: /calcular frete/i }))

    expect(await screen.findByText(/jadlog/i)).toBeInTheDocument()
    expect(screen.getByText(/\.com/i)).toBeInTheDocument()
    expect(screen.getByText(/3 dia/i)).toBeInTheDocument()
  })

  it('resposta com freeShipping mostra "Frete grátis"', async () => {
    server.use(
      http.post('/api/catalog/products/prod-1/shipping-preview', () =>
        HttpResponse.json({ options: [], freeShipping: true }),
      ),
    )
    const user = userEvent.setup()
    render(<ShippingPreview productId="prod-1" />)

    await user.type(screen.getByLabelText(/^cep$/i), '20040-020')
    await user.click(screen.getByRole('button', { name: /calcular frete/i }))

    expect(await screen.findByText(/frete grátis/i)).toBeInTheDocument()
  })

  it('nenhuma opção disponível mostra mensagem apropriada', async () => {
    server.use(
      http.post('/api/catalog/products/prod-1/shipping-preview', () =>
        HttpResponse.json({ options: [], freeShipping: false }),
      ),
    )
    const user = userEvent.setup()
    render(<ShippingPreview productId="prod-1" />)

    await user.type(screen.getByLabelText(/^cep$/i), '20040-020')
    await user.click(screen.getByRole('button', { name: /calcular frete/i }))

    expect(await screen.findByText(/nenhuma opção de frete/i)).toBeInTheDocument()
  })

  it('erro da API (produto com dados de envio pendentes) mostra a mensagem do backend', async () => {
    server.use(
      http.post('/api/catalog/products/prod-1/shipping-preview', () =>
        HttpResponse.json({ message: 'produto com dados de envio pendentes' }, { status: 400 }),
      ),
    )
    const user = userEvent.setup()
    render(<ShippingPreview productId="prod-1" />)

    await user.type(screen.getByLabelText(/^cep$/i), '20040-020')
    await user.click(screen.getByRole('button', { name: /calcular frete/i }))

    await waitFor(() => {
      expect(screen.getByText(/dados de envio pendentes/i)).toBeInTheDocument()
    })
  })

  it('erro de rede/serviço indisponível mostra mensagem genérica', async () => {
    server.use(
      http.post('/api/catalog/products/prod-1/shipping-preview', () =>
        HttpResponse.json({ message: 'Cálculo de frete indisponível no momento' }, { status: 503 }),
      ),
    )
    const user = userEvent.setup()
    render(<ShippingPreview productId="prod-1" />)

    await user.type(screen.getByLabelText(/^cep$/i), '20040-020')
    await user.click(screen.getByRole('button', { name: /calcular frete/i }))

    await waitFor(() => {
      expect(screen.getByText(/indisponível/i)).toBeInTheDocument()
    })
  })
})

describe('ShippingPreview — cliente autenticado sem endereço cadastrado', () => {
  it('cai no campo de CEP manual (mesmo comportamento do anônimo)', async () => {
    server.use(http.get('/api/addresses', () => HttpResponse.json([])))
    await act(async () => {
      useAuthStore.setState({ accessToken: 'token-1', isAuthenticated: true })
    })

    render(<ShippingPreview productId="prod-1" />)

    expect(await screen.findByLabelText(/^cep$/i)).toBeInTheDocument()
  })
})

describe('ShippingPreview — cliente autenticado com endereço cadastrado', () => {
  it('não mostra campo de CEP e calcula automaticamente pro endereço padrão', async () => {
    server.use(
      http.get('/api/addresses', () =>
        HttpResponse.json([
          { id: 'addr-1', street: 'Rua A', number: '1', district: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01310-100', isDefault: false },
          { id: 'addr-2', street: 'Av Rio Branco', number: '1', district: 'Centro', city: 'Rio de Janeiro', state: 'RJ', zipCode: '20040-020', isDefault: true },
        ]),
      ),
      http.post('/api/catalog/products/prod-1/shipping-preview', async ({ request }) => {
        const body = (await request.json()) as { zipCode: string }
        expect(body.zipCode).toBe('20040-020')
        return HttpResponse.json({
          freeShipping: false,
          options: [{ serviceId: '4', carrierName: 'Jadlog', serviceName: '.Com', price: 17.36, deliveryDays: 3 }],
        })
      }),
    )
    await act(async () => {
      useAuthStore.setState({ accessToken: 'token-1', isAuthenticated: true })
    })

    render(<ShippingPreview productId="prod-1" />)

    expect(await screen.findByText(/jadlog/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/^cep$/i)).not.toBeInTheDocument()
    expect(screen.getByText(/rio de janeiro/i)).toBeInTheDocument()
  })

  it('usa o primeiro endereço quando nenhum está marcado como padrão', async () => {
    server.use(
      http.get('/api/addresses', () =>
        HttpResponse.json([
          { id: 'addr-1', street: 'Rua A', number: '1', district: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01310-100', isDefault: false },
        ]),
      ),
      http.post('/api/catalog/products/prod-1/shipping-preview', async ({ request }) => {
        const body = (await request.json()) as { zipCode: string }
        expect(body.zipCode).toBe('01310-100')
        return HttpResponse.json({ freeShipping: true, options: [] })
      }),
    )
    await act(async () => {
      useAuthStore.setState({ accessToken: 'token-1', isAuthenticated: true })
    })

    render(<ShippingPreview productId="prod-1" />)

    expect(await screen.findByText(/frete grátis/i)).toBeInTheDocument()
  })

  it('falha ao buscar endereços cai no campo de CEP manual', async () => {
    server.use(http.get('/api/addresses', () => HttpResponse.json({ message: 'erro' }, { status: 500 })))
    await act(async () => {
      useAuthStore.setState({ accessToken: 'token-1', isAuthenticated: true })
    })

    render(<ShippingPreview productId="prod-1" />)

    expect(await screen.findByLabelText(/^cep$/i)).toBeInTheDocument()
  })
})
