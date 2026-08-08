import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import ContactPage from '../contact/page'

const server = setupServer(
  http.get('http://localhost:8080/api/v1/site/settings', () =>
    HttpResponse.json({
      contactDescription: 'Estamos disponíveis para ajudar.',
      contactPhone: '+55 11 99999-9999',
      contactEmail: 'contato@loja.com',
    }),
  ),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('ContactPage', () => {
  it('renderiza informações de contato quando configuradas', async () => {
    const jsx = await ContactPage()
    render(jsx)
    expect(screen.getByRole('heading', { level: 1, name: /contato/i })).toBeInTheDocument()
    expect(screen.getByText(/estamos disponíveis/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /\+55 11/i })).toHaveAttribute('href', 'tel:+55 11 99999-9999')
    expect(screen.getByRole('link', { name: /contato@loja/i })).toHaveAttribute('href', 'mailto:contato@loja.com')
  })

  it('exibe mensagem de fallback quando todas as informações são null', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/site/settings', () =>
        HttpResponse.json({ contactDescription: null, contactPhone: null, contactEmail: null }),
      ),
    )
    const jsx = await ContactPage()
    render(jsx)
    expect(screen.getByText(/informações de contato em breve/i)).toBeInTheDocument()
  })
})
