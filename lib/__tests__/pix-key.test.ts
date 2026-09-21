import { describe, expect, it } from 'vitest'
import { parsePixKey } from '../pix-key'

// Mesmas entradas do PixKeyValidatorTest (backend): as regras precisam ser idênticas nos dois lados.
describe('parsePixKey', () => {
  it('CPF válido, com e sem pontuação, vira só dígitos', () => {
    expect(parsePixKey('529.982.247-25')).toEqual({ type: 'CPF', value: '52998224725' })
    expect(parsePixKey('11144477735')).toEqual({ type: 'CPF', value: '11144477735' })
  })

  it.each(['529.982.247-26', '111.111.111-11', '11999999999', '5299822472', '529982247255'])(
    'CPF inválido (dígito verificador, dígitos iguais ou tamanho): %s',
    (value) => expect(parsePixKey(value)).toBeNull(),
  )

  it('CNPJ válido, com e sem pontuação, vira só dígitos', () => {
    expect(parsePixKey('11.444.777/0001-61')).toEqual({ type: 'CNPJ', value: '11444777000161' })
    expect(parsePixKey('04252011000110')?.type).toBe('CNPJ')
  })

  it.each(['11.444.777/0001-62', '11.111.111/1111-11', '1144477700016', '114447770001611'])(
    'CNPJ inválido: %s',
    (value) => expect(parsePixKey(value)).toBeNull(),
  )

  it('e-mail válido vira minúsculas', () => {
    expect(parsePixKey('  Loja@Exemplo.COM.br ')).toEqual({ type: 'EMAIL', value: 'loja@exemplo.com.br' })
  })

  it.each(['semarroba.com', 'loja@', '@exemplo.com', 'loja@exemplo', 'loja @exemplo.com'])(
    'e-mail inválido: %s',
    (value) => expect(parsePixKey(value)).toBeNull(),
  )

  it('e-mail com mais de 77 caracteres é inválido', () => {
    expect(parsePixKey(`${'a'.repeat(70)}@exemplo.com`)).toBeNull()
    expect(parsePixKey(`${'a'.repeat(60)}@exemplo.com`)).not.toBeNull()
  })

  it('telefone com +55 (celular ou fixo), com e sem máscara, é normalizado', () => {
    expect(parsePixKey('+5511999999999')).toEqual({ type: 'PHONE', value: '+5511999999999' })
    expect(parsePixKey('+55 (11) 99999-9999')).toEqual({ type: 'PHONE', value: '+5511999999999' })
    expect(parsePixKey('+551133334444')).toEqual({ type: 'PHONE', value: '+551133334444' })
  })

  it.each(['+55119999', '+5511999999999999', '+55 (01) 99999-9999', '+5411999999999', '+55(11)99999-999a'])(
    'telefone inválido: %s',
    (value) => expect(parsePixKey(value)).toBeNull(),
  )

  it('telefone sem +55 é inválido, e 11 dígitos sem + válidos como CPF são CPF', () => {
    expect(parsePixKey('(11) 99999-9999')).toBeNull()
    expect(parsePixKey('52998224725')?.type).toBe('CPF')
  })

  it('chave aleatória (UUID) vira minúsculas', () => {
    expect(parsePixKey('123E4567-E89B-42D3-A456-426614174000')).toEqual({
      type: 'RANDOM',
      value: '123e4567-e89b-42d3-a456-426614174000',
    })
  })

  it.each(['123e4567-e89b-42d3-a456-42661417400', '123e4567-e89b-42d3-a456-42661417400g', '123e4567e89b42d3a456426614174000'])(
    'UUID inválido: %s',
    (value) => expect(parsePixKey(value)).toBeNull(),
  )

  it.each([null, undefined, '', '   ', 'abc', '!!!'])('nulo, vazio ou lixo é inválido: %s', (value) =>
    expect(parsePixKey(value)).toBeNull(),
  )
})
