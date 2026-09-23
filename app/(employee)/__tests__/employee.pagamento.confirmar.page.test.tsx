import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { PaymentConfirmContent } from '@/components/content/dashboard/sales/PaymentConfirmContent'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminOrderDetailResponse } from '@/types'

const pushMock = vi.fn()
const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}))

const mockOrder: AdminOrderDetailResponse = {
  id: 'order-1',
  orderNumber: 42,
  customerName: 'Ana Lima',
  customerEmail: 'ana@test.com',
  status: 'CONFIRMED',
  totalAmount: 150,
  paymentMethod: 'PIX',
  paymentStatus: 'PENDING',
  createdAt: '2026-01-01T00:00:00Z',
  itemCount: 1,
  items: [],
  address: {
    id: 'addr-1',
    street: 'Rua A',
    number: '1',
    district: 'Bairro',
    city: 'Cidade',
    state: 'SP',
    zipCode: '00000-000',
    isDefault: true,
  },
  statusHistory: [],
}

const server = setupServer(
  http.get('/api/admin/orders/:id', () => HttpResponse.json(mockOrder)),
  http.post('/api/upload/payment-receipt', () =>
    HttpResponse.json({ url: 'https://cdn.example.com/receipt.pdf' }),
  ),
  http.patch('/api/admin/orders/:id/payment-status', () =>
    HttpResponse.json({ ...mockOrder, paymentStatus: 'PAID' }),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  pushMock.mockClear()
  replaceMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    isAuthenticated: true,
    accessToken: 'mock-token',
    role: 'EMPLOYEE' as const,
    user: {
      id: '1',
      name: 'Func',
      email: 'func@test.com',
      role: 'EMPLOYEE' as const,
      permissions: ['MANAGE_PAYMENTS' as const],
     phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
  })
})

function renderContent(id = 'order-1') {
  return render(
    <ToastProvider>
      <PaymentConfirmContent id={id} />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('PaymentConfirmContent — dados do pedido', () => {
  it('exibe dados do pedido após carregamento', async () => {
    renderContent()
    expect(await screen.findByText(/#42/)).toBeInTheDocument()
    expect(screen.getByText('Ana Lima')).toBeInTheDocument()
    expect(screen.getByText(/PIX/i)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*150/)).toBeInTheDocument()
  })

  it('exibe a origem do pagamento (gateway) quando o pedido tem esse dado', async () => {
    server.use(http.get('/api/admin/orders/:id', () => HttpResponse.json({ ...mockOrder, paymentProvider: 'PAGSEGURO' })))
    renderContent()

    expect(await screen.findByText('PagBank')).toBeInTheDocument()
  })

  it('pedido antigo, sem gateway registrado, não mostra "Origem"', async () => {
    renderContent()

    await screen.findByText('#42')
    expect(screen.queryByText(/origem/i)).not.toBeInTheDocument()
  })

  it('exibe botão de copiar ao lado do nome do cliente', async () => {
    renderContent()
    await screen.findByText('Ana Lima')
    expect(screen.getByRole('button', { name: 'Copiar nome do cliente' })).toBeInTheDocument()
  })

  it('exibe mensagem quando pedido não é encontrado', async () => {
    server.use(http.get('/api/admin/orders/:id', () => new HttpResponse(null, { status: 404 })))
    renderContent('nao-existe')
    expect(await screen.findByText(/não encontrado/i)).toBeInTheDocument()
  })
})

describe('PaymentConfirmContent — formulário', () => {
  it('FileUpload está presente na página', async () => {
    renderContent()
    await screen.findByText('Ana Lima')
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
  })

  it('botão "Confirmar" está desabilitado sem arquivo selecionado', async () => {
    renderContent()
    await screen.findByText('Ana Lima')
    expect(screen.getByRole('button', { name: /confirmar pagamento/i })).toBeDisabled()
  })

  it('aceita PDF no atributo accept do input de arquivo', async () => {
    renderContent()
    await screen.findByText('Ana Lima')
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput.accept).toContain('application/pdf')
  })

  it('botão "Cancelar" navega para backPath sem chamar nenhum endpoint', async () => {
    renderContent()
    await screen.findByText('Ana Lima')
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(pushMock).toHaveBeenCalledWith('/dashboard/payments')
    expect(pushMock).toHaveBeenCalledTimes(1)
  })
})

describe('PaymentConfirmContent — confirmação com arquivo', () => {
  it('confirma pagamento: upload + PATCH + toast + navega para backPath', async () => {
    let capturedBody: unknown = null
    server.use(
      http.patch('/api/admin/orders/:id/payment-status', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ ...mockOrder, paymentStatus: 'PAID' })
      }),
    )

    renderContent()
    await screen.findByText('Ana Lima')

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = new File(['conteudo'], 'comprovante.jpg', { type: 'image/jpeg' })
    await userEvent.upload(fileInput, mockFile)

    await userEvent.click(screen.getByRole('button', { name: /confirmar pagamento/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/confirmado/i)
    expect(pushMock).toHaveBeenCalledWith('/dashboard/payments')
    expect(capturedBody).toMatchObject({
      status: 'PAID',
      receiptUrl: 'https://cdn.example.com/receipt.pdf',
    })
  })

  it('confirma pagamento com comprovante em PDF: upload + PATCH + toast', async () => {
    let capturedBody: unknown = null
    server.use(
      http.patch('/api/admin/orders/:id/payment-status', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ ...mockOrder, paymentStatus: 'PAID' })
      }),
    )

    renderContent()
    await screen.findByText('Ana Lima')

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = new File(['%PDF-1.4'], 'comprovante.pdf', { type: 'application/pdf' })
    await userEvent.upload(fileInput, mockFile)

    await userEvent.click(screen.getByRole('button', { name: /confirmar pagamento/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/confirmado/i)
    expect(capturedBody).toMatchObject({
      status: 'PAID',
      receiptUrl: 'https://cdn.example.com/receipt.pdf',
    })
  })

  it('botão fica desabilitado durante a requisição', async () => {
    let resolve!: () => void
    server.use(
      http.post('/api/upload/payment-receipt', () =>
        new Promise<Response>((res) => {
          resolve = () => res(HttpResponse.json({ url: 'https://cdn.example.com/r.pdf' }) as unknown as Response)
        }),
      ),
    )

    renderContent()
    await screen.findByText('Ana Lima')

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(fileInput, new File(['x'], 'r.jpg', { type: 'image/jpeg' }))

    await userEvent.click(screen.getByRole('button', { name: /confirmar pagamento/i }))

    expect(screen.getByRole('button', { name: /confirmar pagamento/i })).toBeDisabled()

    resolve()
  })

  it('exibe toast de erro se o upload falhar (PATCH não é chamado)', async () => {
    let patchCalled = false
    server.use(
      http.post('/api/upload/payment-receipt', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
      http.patch('/api/admin/orders/:id/payment-status', () => {
        patchCalled = true
        return HttpResponse.json({})
      }),
    )

    renderContent()
    await screen.findByText('Ana Lima')

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(fileInput, new File(['x'], 'r.jpg', { type: 'image/jpeg' }))
    await userEvent.click(screen.getByRole('button', { name: /confirmar pagamento/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao enviar comprovante/i)
    expect(patchCalled).toBe(false)
  })

  it('exibe toast de erro se o PATCH falhar', async () => {
    server.use(
      http.patch('/api/admin/orders/:id/payment-status', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    )

    renderContent()
    await screen.findByText('Ana Lima')

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(fileInput, new File(['x'], 'r.jpg', { type: 'image/jpeg' }))
    await userEvent.click(screen.getByRole('button', { name: /confirmar pagamento/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao confirmar pagamento/i)
  })
})

describe('PaymentConfirmContent — pagar na retirada', () => {
  const pickupOrder = { ...mockOrder, paymentMethod: 'PAY_ON_PICKUP' as const }

  it('mostra o rótulo "Pagar na retirada" como método', async () => {
    server.use(http.get('/api/admin/orders/:id', () => HttpResponse.json(pickupOrder)))
    renderContent()

    expect(await screen.findByText('Pagar na retirada')).toBeInTheDocument()
  })

  it('o comprovante é opcional: "Confirmar pagamento" já vem habilitado sem arquivo', async () => {
    server.use(http.get('/api/admin/orders/:id', () => HttpResponse.json(pickupOrder)))
    renderContent()

    expect(await screen.findByRole('button', { name: /confirmar pagamento/i })).toBeEnabled()
  })

  it('confirma sem arquivo: só o PATCH { status: PAID }, sem upload, e navega para backPath', async () => {
    let uploadCalled = false
    let patchBody: Record<string, unknown> = {}
    server.use(
      http.get('/api/admin/orders/:id', () => HttpResponse.json(pickupOrder)),
      http.post('/api/upload/payment-receipt', () => {
        uploadCalled = true
        return HttpResponse.json({ url: 'x' })
      }),
      http.patch('/api/admin/orders/:id/payment-status', async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...pickupOrder, paymentStatus: 'PAID' })
      }),
    )
    const user = userEvent.setup()
    renderContent()

    await user.click(await screen.findByRole('button', { name: /confirmar pagamento/i }))

    expect(await screen.findByText(/pagamento confirmado com sucesso/i)).toBeInTheDocument()
    expect(uploadCalled).toBe(false)
    expect(patchBody).toEqual({ status: 'PAID' })
    expect(pushMock).toHaveBeenCalledWith('/dashboard/payments')
  })

  it('PIX continua exigindo o comprovante (botão desabilitado sem arquivo)', async () => {
    renderContent()

    expect(await screen.findByRole('button', { name: /confirmar pagamento/i })).toBeDisabled()
  })
})

describe('PaymentConfirmContent — controle de acesso', () => {
  it('redireciona para /dashboard quando usuário não tem MANAGE_PAYMENTS', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      role: 'EMPLOYEE' as const,
      user: { id: '1', name: 'F', email: 'f@test.com', role: 'EMPLOYEE' as const, permissions: ['MANAGE_ORDERS' as const] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
    })
    await act(async () => { renderContent() })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})
