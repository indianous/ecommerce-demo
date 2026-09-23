import { describe, expect, it } from 'vitest'
import { buildCatalogUrl } from '../catalogUrl'

describe('buildCatalogUrl', () => {
  it('sem nenhum parâmetro retorna /catalog', () => {
    expect(buildCatalogUrl({})).toBe('/catalog')
  })

  it('só search retorna /catalog?search=teclado', () => {
    expect(buildCatalogUrl({ search: 'teclado' })).toBe('/catalog?search=teclado')
  })

  it('category + search + sort + page juntos aparecem todos, na ordem esperada', () => {
    expect(
      buildCatalogUrl({ category: 'eletronicos', search: 'teclado', sort: 'PRICE_ASC', page: 3 }),
    ).toBe('/catalog?category=eletronicos&search=teclado&sort=PRICE_ASC&page=3')
  })

  it('sort NAME_ASC (valor default do backend) é omitido da URL', () => {
    expect(buildCatalogUrl({ sort: 'NAME_ASC' })).toBe('/catalog')
  })

  it('page 1 é omitido da URL', () => {
    expect(buildCatalogUrl({ page: 1 })).toBe('/catalog')
  })

  it('sort diferente de NAME_ASC aparece na URL', () => {
    expect(buildCatalogUrl({ sort: 'NEWEST' })).toBe('/catalog?sort=NEWEST')
  })

  it('page maior que 1 aparece na URL', () => {
    expect(buildCatalogUrl({ page: 2 })).toBe('/catalog?page=2')
  })

  it('onSale=true aparece como onSale=true, depois de sort e antes de page', () => {
    expect(buildCatalogUrl({ category: 'tech', sort: 'PRICE_ASC', onSale: true, page: 2 }))
      .toBe('/catalog?category=tech&sort=PRICE_ASC&onSale=true&page=2')
  })

  it('onSale=false é omitido da URL', () => {
    expect(buildCatalogUrl({ onSale: false })).toBe('/catalog')
  })
})
