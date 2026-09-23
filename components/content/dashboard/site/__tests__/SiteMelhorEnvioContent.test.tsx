import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteMelhorEnvioContent } from '../SiteMelhorEnvioContent'
import { employeeWithSite, renderSection, setupSiteServer, signIn } from './site-test-utils'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))

setupSiteServer()

describe('SiteMelhorEnvioContent', () => {
  beforeEach(() => signIn(employeeWithSite))

  it('mostra o heading da página, o link "← Voltar" e o card de conexão do Melhor Envio', async () => {
    renderSection(<SiteMelhorEnvioContent backPath="/dashboard/admin/site" />)

    expect(await screen.findByRole('heading', { level: 1, name: /melhor envio/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /voltar/i })).toHaveAttribute('href', '/dashboard/admin/site')
    expect(await screen.findByText(/^não conectado$/i)).toBeInTheDocument()
  })
})
