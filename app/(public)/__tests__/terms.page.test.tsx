import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import TermsAndConditionsPage from '../terms-and-conditions/page'

const server = setupServer(
  http.get('http://localhost:8080/api/v1/site/settings', () =>
    HttpResponse.json({ termsContent: 'Ao usar nosso site você concorda com os termos.' }),
  ),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('TermsAndConditionsPage', () => {
  it('renderiza conteúdo markdown quando configurado', async () => {
    const jsx = await TermsAndConditionsPage()
    render(jsx)
    expect(screen.getByRole('heading', { level: 1, name: /termos e condições/i })).toBeInTheDocument()
    expect(screen.getByText(/ao usar nosso site/i)).toBeInTheDocument()
  })

  it('exibe mensagem de fallback quando termsContent é null', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/site/settings', () =>
        HttpResponse.json({ termsContent: null }),
      ),
    )
    const jsx = await TermsAndConditionsPage()
    render(jsx)
    expect(screen.getByText(/conteúdo em breve/i)).toBeInTheDocument()
  })
})
