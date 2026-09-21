import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SITE_SECTIONS } from '@/lib/site-sections'
import { SiteSectionContent } from '../SiteSectionContent'
import { employeeWithSite, renderSection, setupSiteServer, signIn } from './site-test-utils'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))

setupSiteServer()

describe('SiteSectionContent', () => {
  beforeEach(() => signIn(employeeWithSite))

  it.each(SITE_SECTIONS.map((s) => [s.slug, s.title] as const))(
    '%s renderiza a página da seção, com o heading "%s"',
    async (slug, title) => {
      renderSection(<SiteSectionContent slug={slug} backPath="/dashboard/site" />)

      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    },
  )

  it('slug sem componente não renderiza nada', () => {
    const { container } = renderSection(<SiteSectionContent slug="nao-existe" backPath="/dashboard/site" />)

    expect(container.querySelector('main')).toBeNull()
  })
})
