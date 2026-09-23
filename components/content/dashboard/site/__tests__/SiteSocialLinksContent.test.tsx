import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteSocialLinksContent } from '../SiteSocialLinksContent'
import { employeeWithSite, renderSection, setupSiteServer, signIn } from './site-test-utils'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))

const server = setupSiteServer()

describe('SiteSocialLinksContent', () => {
  beforeEach(() => signIn(employeeWithSite))

  it('carrega os links atuais', async () => {
    renderSection(<SiteSocialLinksContent backPath="/dashboard/site" />)

    expect(await screen.findByLabelText('Instagram')).toHaveValue('https://instagram.com/loja')
    expect(screen.getByLabelText('TikTok')).toHaveValue('https://tiktok.com/@loja')
    expect(screen.getByLabelText('Facebook')).toHaveValue('https://facebook.com/loja')
  })

  it('envia por PUT { instagramUrl, tiktokUrl, facebookUrl } e mostra toast de sucesso', async () => {
    let body: unknown
    server.use(
      http.put('/api/site/settings/social-links', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({})
      }),
    )
    renderSection(<SiteSocialLinksContent backPath="/dashboard/site" />)

    await userEvent.click(await screen.findByRole('button', { name: /salvar redes sociais/i }))

    expect(await screen.findByText(/redes sociais atualizadas com sucesso/i)).toBeInTheDocument()
    expect(body).toEqual({
      instagramUrl: 'https://instagram.com/loja',
      tiktokUrl: 'https://tiktok.com/@loja',
      facebookUrl: 'https://facebook.com/loja',
    })
  })

  it('exibe toast de erro se o PUT falhar', async () => {
    server.use(http.put('/api/site/settings/social-links', () => HttpResponse.json({}, { status: 500 })))
    renderSection(<SiteSocialLinksContent backPath="/dashboard/site" />)

    await userEvent.click(await screen.findByRole('button', { name: /salvar redes sociais/i }))

    expect(await screen.findByText(/erro ao salvar redes sociais/i)).toBeInTheDocument()
  })
})
