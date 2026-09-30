import { describe, expect, it } from 'vitest'
import { isAbsoluteHttpUrl, isSafeLink } from '../safe-url'

// Mesma regra do backend (SafeUrls, plano 74): o backend recusa com 400 o que não passar aqui.
describe('safe-url', () => {
  it('isSafeLink aceita http(s) com host e caminho da loja; vazio passa', () => {
    for (const url of ['https://instagram.com/loja', 'http://parceiro.com.br/x?y=1', '/catalog?category=blusas', '', '   ']) {
      expect(isSafeLink(url), url).toBe(true)
    }
  })

  it('isSafeLink recusa javascript:, data:, protocolo-relativo e texto sem esquema', () => {
    for (const url of ['javascript:alert(1)', ' JAVASCRIPT:alert(1)', 'data:text/html,x', 'vbscript:x', '//evil.example', 'instagram.com/loja', 'https://', '/\\evil.example']) {
      expect(isSafeLink(url), url).toBe(false)
    }
  })

  it('isAbsoluteHttpUrl só aceita http(s) com host (sem caminho relativo)', () => {
    expect(isAbsoluteHttpUrl('https://tiktok.com/@loja')).toBe(true)
    expect(isAbsoluteHttpUrl('/catalog')).toBe(false)
    expect(isAbsoluteHttpUrl('tiktok.com/@loja')).toBe(false)
    expect(isAbsoluteHttpUrl('javascript:alert(1)')).toBe(false)
  })
})
