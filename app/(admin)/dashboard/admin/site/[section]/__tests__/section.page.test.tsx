import { describe, expect, it, vi } from 'vitest'

const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404')
  }),
)
vi.mock('next/navigation', () => ({ notFound: notFoundMock }))
vi.mock('@/components/content/site/SiteSectionContent', () => ({ SiteSectionContent: () => null }))

import SiteSectionPage, { generateMetadata } from '../page'

const params = (section: string) => ({ params: Promise.resolve({ section }) })

describe('Admin — rota dinâmica /site/[section]', () => {
  it('slug válido renderiza a seção certa com o backPath do shell', async () => {
    const element = await SiteSectionPage(params('logo'))

    expect(element.props).toEqual({ slug: 'logo', backPath: '/dashboard/admin/site' })
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it.each(['favicon', 'payment-gateway', 'melhor-envio'])('aceita o slug "%s"', async (slug) => {
    const element = await SiteSectionPage(params(slug))

    expect(element.props.slug).toBe(slug)
  })

  it('slug desconhecido chama notFound()', async () => {
    await expect(SiteSectionPage(params('nao-existe'))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    expect(notFoundMock).toHaveBeenCalled()
  })

  it('generateMetadata devolve o título da seção', async () => {
    expect(await generateMetadata(params('logo'))).toEqual({ title: 'Logo da loja' })
    expect(await generateMetadata(params('terms'))).toEqual({ title: 'Termos e condições' })
  })
})
