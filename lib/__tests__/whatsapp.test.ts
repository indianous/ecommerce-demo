import { describe, expect, it } from 'vitest'
import { whatsappUrl } from '../whatsapp'

describe('whatsappUrl', () => {
  it('monta o link wa.me com o código do país', () => {
    expect(whatsappUrl('+55 11 99999-9999')).toBe('https://wa.me/5511999999999')
    expect(whatsappUrl('5511999999999')).toBe('https://wa.me/5511999999999')
  })

  it('telefone sem código do país (10 ou 11 dígitos) ganha 55', () => {
    expect(whatsappUrl('(11) 99999-9999')).toBe('https://wa.me/5511999999999')
    expect(whatsappUrl('(11) 3333-4444')).toBe('https://wa.me/551133334444')
  })

  it.each([null, undefined, '', '   ', 'abc', '123'])('telefone inválido ou ausente devolve null: %s', (value) => {
    expect(whatsappUrl(value)).toBeNull()
  })
})
