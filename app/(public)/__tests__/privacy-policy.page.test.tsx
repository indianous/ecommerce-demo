import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import PrivacyPolicyPage from '../privacy-policy/page'

const server = setupServer(
  http.get('http://localhost:8080/api/v1/site/settings', () =>
    HttpResponse.json({ privacyPolicyContent: 'Seus dados estão seguros conosco.' }),
  ),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('PrivacyPolicyPage', () => {
  it('renderiza conteúdo markdown quando configurado', async () => {
    const jsx = await PrivacyPolicyPage()
    render(jsx)
    expect(screen.getByRole('heading', { level: 1, name: /política de privacidade/i })).toBeInTheDocument()
    expect(screen.getByText(/seus dados estão seguros/i)).toBeInTheDocument()
  })

  it('exibe mensagem de fallback quando privacyPolicyContent é null', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/site/settings', () =>
        HttpResponse.json({ privacyPolicyContent: null }),
      ),
    )
    const jsx = await PrivacyPolicyPage()
    render(jsx)
    expect(screen.getByText(/conteúdo em breve/i)).toBeInTheDocument()
  })
})
