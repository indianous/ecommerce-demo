import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteBannersContent } from '../SiteBannersContent'
import { employeeWithSite, renderSection, setupSiteServer, signIn } from './site-test-utils'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))

let banners: { id: string; imageUrl: string; linkUrl: string | null }[] = []
let lastDeletedBannerId = ''

const server = setupSiteServer(
  http.get('/api/site/banners', () => HttpResponse.json(banners)),
  http.delete('/api/site/banners/:id', ({ params }) => {
    lastDeletedBannerId = params.id as string
    return new HttpResponse(null, { status: 204 })
  }),
)

const jpg = () => new File(['x'], 'banner.jpg', { type: 'image/jpeg' })

describe('SiteBannersContent', () => {
  beforeEach(() => signIn(employeeWithSite))
  afterEach(() => {
    banners = []
    lastDeletedBannerId = ''
  })

  it('lista os banners cadastrados', async () => {
    banners = [{ id: 'banner-1', imageUrl: 'https://cdn.test/banner.jpg', linkUrl: 'https://loja.com/promo' }]
    renderSection(<SiteBannersContent backPath="/dashboard/site" />)

    expect(await screen.findByRole('heading', { level: 1, name: /^banners$/i })).toBeInTheDocument()
    expect(await screen.findByAltText('Banner')).toBeInTheDocument()
    expect(screen.getByText('https://loja.com/promo')).toBeInTheDocument()
  })

  it('"Adicionar banner" fica desabilitado sem arquivo', async () => {
    renderSection(<SiteBannersContent backPath="/dashboard/site" />)

    expect(await screen.findByRole('button', { name: /adicionar banner/i })).toBeDisabled()
  })

  it('envia o arquivo por POST e mostra toast de sucesso', async () => {
    server.use(
      http.post('/api/site/banners', () =>
        HttpResponse.json({ id: 'ban-1', imageUrl: 'https://cdn.example.com/banner.jpg', linkUrl: null }, { status: 201 }),
      ),
    )
    const { container } = renderSection(<SiteBannersContent backPath="/dashboard/site" />)
    await screen.findByRole('button', { name: /adicionar banner/i })

    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, jpg())
    await userEvent.click(screen.getByRole('button', { name: /adicionar banner/i }))

    expect(await screen.findByText(/banner adicionado com sucesso/i)).toBeInTheDocument()
    expect(screen.getByAltText('Banner')).toBeInTheDocument()
  })

  it('exibe toast de erro se o POST falhar', async () => {
    server.use(http.post('/api/site/banners', () => HttpResponse.json({}, { status: 500 })))
    const { container } = renderSection(<SiteBannersContent backPath="/dashboard/site" />)
    await screen.findByRole('button', { name: /adicionar banner/i })

    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, jpg())
    await userEvent.click(screen.getByRole('button', { name: /adicionar banner/i }))

    expect(await screen.findByText(/erro ao salvar banner/i)).toBeInTheDocument()
  })

  it('remover banner mostra confirmação antes de excluir', async () => {
    banners = [{ id: 'banner-1', imageUrl: 'https://cdn.test/banner.jpg', linkUrl: null }]
    renderSection(<SiteBannersContent backPath="/dashboard/site" />)

    await userEvent.click(await screen.findByRole('button', { name: /remover/i }))

    expect(screen.getByRole('dialog', { name: /remover banner/i })).toBeInTheDocument()
    expect(lastDeletedBannerId).toBe('')

    await userEvent.click(screen.getByRole('button', { name: /^confirmar$/i }))

    expect(await screen.findByText(/banner removido/i)).toBeInTheDocument()
    expect(lastDeletedBannerId).toBe('banner-1')
  })

  it('cancelar a confirmação não remove o banner', async () => {
    banners = [{ id: 'banner-1', imageUrl: 'https://cdn.test/banner.jpg', linkUrl: null }]
    renderSection(<SiteBannersContent backPath="/dashboard/site" />)

    await userEvent.click(await screen.findByRole('button', { name: /remover/i }))
    await userEvent.click(screen.getByRole('button', { name: /^cancelar$/i }))

    expect(screen.queryByRole('dialog', { name: /remover banner/i })).not.toBeInTheDocument()
    expect(lastDeletedBannerId).toBe('')
  })
})
