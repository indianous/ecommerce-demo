import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { SiteSettingsProvider, useSiteSettings } from '../SiteSettingsContext'

function Probe() {
  const { navbarItems, footerColumns } = useSiteSettings()
  return (
    <pre data-testid="probe">{JSON.stringify({ navbarItems, footerColumns })}</pre>
  )
}

function renderProbe() {
  render(
    <SiteSettingsProvider>
      <Probe />
    </SiteSettingsProvider>,
  )
}

async function readProbe() {
  const el = await screen.findByTestId('probe')
  return JSON.parse(el.textContent ?? '{}') as {
    navbarItems: unknown[]
    footerColumns: unknown[]
  }
}

const emptySettings = {
  placeholderImageUrl: null, faviconUrl: null, logoUrl: null, siteTitle: null,
  defaultDescription: null, aboutUsContent: null, contactDescription: null,
  contactPhone: null, contactEmail: null, instagramUrl: null, tiktokUrl: null,
  facebookUrl: null, privacyPolicyContent: null, termsContent: null, refundPolicyContent: null,
}

const collectionBoth = {
  id: 'col-1',
  type: 'COLLECTION',
  label: 'Institucional',
  placement: 'BOTH',
  position: 0,
  children: [
    { id: 'child-1', type: 'LINK', label: 'Sobre nós', url: '/about-us', placement: null, position: 0, children: [] },
  ],
}

const directLinkFooter = {
  id: 'link-1',
  type: 'LINK',
  label: 'Trocas e devoluções',
  url: '/refund-policy',
  placement: 'FOOTER',
  position: 1,
  children: [],
}

const server = setupServer(
  http.get('/api/site/settings', () => HttpResponse.json(emptySettings)),
  http.get('/api/site/nav-items', () => HttpResponse.json([collectionBoth, directLinkFooter])),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('SiteSettingsProvider — navegação', () => {
  it('coleção placement BOTH vira dropdown em navbarItems e coluna em footerColumns', async () => {
    renderProbe()
    const { navbarItems, footerColumns } = await readProbe()

    expect(navbarItems).toContainEqual({
      type: 'dropdown',
      label: 'Institucional',
      items: [{ label: 'Sobre nós', href: '/about-us' }],
    })
    expect(footerColumns).toContainEqual({
      title: 'Institucional',
      links: [{ label: 'Sobre nós', href: '/about-us' }],
    })
  })

  it('link direto placement FOOTER vira uma coluna de 1 link e não aparece em navbarItems', async () => {
    renderProbe()
    const { navbarItems, footerColumns } = await readProbe()

    expect(footerColumns).toContainEqual({
      title: 'Trocas e devoluções',
      links: [{ label: 'Trocas e devoluções', href: '/refund-policy' }],
    })
    expect(navbarItems).not.toContainEqual(
      expect.objectContaining({ label: 'Trocas e devoluções' }),
    )
  })

  it('item com placement NAVBAR não aparece em footerColumns', async () => {
    server.use(
      http.get('/api/site/nav-items', () =>
        HttpResponse.json([
          { id: 'nav-1', type: 'LINK', label: 'Catálogo', url: '/catalog', placement: 'NAVBAR', position: 0, children: [] },
        ]),
      ),
    )
    renderProbe()
    const { navbarItems, footerColumns } = await readProbe()

    expect(navbarItems).toContainEqual({ type: 'link', label: 'Catálogo', href: '/catalog' })
    expect(footerColumns).toEqual([])
  })

  it('falha no fetch expõe listas vazias sem quebrar a renderização', async () => {
    server.use(
      http.get('/api/site/nav-items', () => HttpResponse.json({ message: 'error' }, { status: 500 })),
    )
    renderProbe()
    const { navbarItems, footerColumns } = await readProbe()

    expect(navbarItems).toEqual([])
    expect(footerColumns).toEqual([])
  })
})
