import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import RefundPolicyPage from '../refund-policy/page'

const server = setupServer(
  http.get('http://localhost:8080/api/v1/site/settings', () =>
    HttpResponse.json({ refundPolicyContent: 'Reembolso em até 7 dias após a compra.' }),
  ),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('RefundPolicyPage', () => {
  it('renderiza conteúdo markdown quando configurado', async () => {
    const jsx = await RefundPolicyPage()
    render(jsx)
    expect(screen.getByRole('heading', { level: 1, name: /política de reembolso/i })).toBeInTheDocument()
    expect(screen.getByText(/reembolso em até 7 dias/i)).toBeInTheDocument()
  })

  it('exibe mensagem de fallback quando refundPolicyContent é null', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/site/settings', () =>
        HttpResponse.json({ refundPolicyContent: null }),
      ),
    )
    const jsx = await RefundPolicyPage()
    render(jsx)
    expect(screen.getByText(/conteúdo em breve/i)).toBeInTheDocument()
  })
})
