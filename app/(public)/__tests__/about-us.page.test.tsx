import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import AboutUsPage from '../about-us/page'

const server = setupServer(
  http.get('http://localhost:8080/api/v1/site/settings', () =>
    HttpResponse.json({ aboutUsContent: '## Quem somos\n\nUma loja incrível.' }),
  ),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('AboutUsPage', () => {
  it('renderiza conteúdo markdown quando aboutUsContent está configurado', async () => {
    const jsx = await AboutUsPage()
    render(jsx)
    expect(screen.getByRole('heading', { level: 1, name: /sobre nós/i })).toBeInTheDocument()
    expect(screen.getByText(/uma loja incrível/i)).toBeInTheDocument()
  })

  it('exibe mensagem de fallback quando aboutUsContent é null', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/site/settings', () =>
        HttpResponse.json({ aboutUsContent: null }),
      ),
    )
    const jsx = await AboutUsPage()
    render(jsx)
    expect(screen.getByText(/conteúdo em breve/i)).toBeInTheDocument()
  })
})
