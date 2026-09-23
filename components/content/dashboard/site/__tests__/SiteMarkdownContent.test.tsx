import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteAboutUsContent } from '../SiteAboutUsContent'
import { SitePrivacyPolicyContent } from '../SitePrivacyPolicyContent'
import { SiteRefundPolicyContent } from '../SiteRefundPolicyContent'
import { SiteTermsContent } from '../SiteTermsContent'
import { employeeWithSite, fullSettings, renderSection, setupSiteServer, signIn } from './site-test-utils'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))

const server = setupSiteServer()

type Case = {
  name: string
  Component: ComponentType<{ backPath: string }>
  heading: RegExp
  endpoint: string
  current: string
  saveLabel: RegExp
  success: RegExp
  error: RegExp
}

const cases: Case[] = [
  { name: 'sobre nós', Component: SiteAboutUsContent, heading: /^sobre nós$/i, endpoint: '/api/site/settings/about-us', current: fullSettings.aboutUsContent, saveLabel: /salvar sobre nós/i, success: /sobre nós atualizado com sucesso/i, error: /erro ao salvar sobre nós/i },
  { name: 'política de privacidade', Component: SitePrivacyPolicyContent, heading: /política de privacidade/i, endpoint: '/api/site/settings/privacy-policy', current: fullSettings.privacyPolicyContent, saveLabel: /salvar política de privacidade/i, success: /política de privacidade atualizada com sucesso/i, error: /erro ao salvar política de privacidade/i },
  { name: 'termos e condições', Component: SiteTermsContent, heading: /termos e condições/i, endpoint: '/api/site/settings/terms', current: fullSettings.termsContent, saveLabel: /salvar termos e condições/i, success: /termos e condições atualizados com sucesso/i, error: /erro ao salvar termos e condições/i },
  { name: 'política de reembolso', Component: SiteRefundPolicyContent, heading: /política de reembolso/i, endpoint: '/api/site/settings/refund-policy', current: fullSettings.refundPolicyContent, saveLabel: /salvar política de reembolso/i, success: /política de reembolso atualizada com sucesso/i, error: /erro ao salvar política de reembolso/i },
]

describe.each(cases)('$name', ({ Component, heading, endpoint, current, saveLabel, success, error }) => {
  beforeEach(() => signIn(employeeWithSite))

  it('mostra o heading e carrega o conteúdo atual', async () => {
    renderSection(<Component backPath="/dashboard/site" />)

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(await screen.findByLabelText('Conteúdo')).toHaveValue(current)
  })

  it('envia { content } por PUT e mostra toast de sucesso', async () => {
    let body: unknown
    server.use(
      http.put(endpoint, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({})
      }),
    )
    renderSection(<Component backPath="/dashboard/site" />)

    await userEvent.click(await screen.findByRole('button', { name: saveLabel }))

    expect(await screen.findByText(success)).toBeInTheDocument()
    expect(body).toEqual({ content: current })
  })

  it('exibe toast de erro se o PUT falhar', async () => {
    server.use(http.put(endpoint, () => HttpResponse.json({}, { status: 500 })))
    renderSection(<Component backPath="/dashboard/site" />)

    await userEvent.click(await screen.findByRole('button', { name: saveLabel }))

    expect(await screen.findByText(error)).toBeInTheDocument()
  })
})
