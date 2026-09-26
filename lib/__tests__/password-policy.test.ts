import { describe, expect, it } from 'vitest'
import { MIN_PASSWORD_LENGTH, passwordErrors } from '../password-policy'

describe('password-policy', () => {
  it('mínimo de 8 caracteres, como no backend', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8)
  })

  it('senha curta → erro na senha', () => {
    expect(passwordErrors('curta', 'curta')).toEqual({ password: 'A senha deve ter pelo menos 8 caracteres' })
  })

  it('confirmação diferente → erro na confirmação', () => {
    expect(passwordErrors('senhaSegura1', 'senhaSegura2')).toEqual({ confirm: 'As senhas não coincidem' })
  })

  it('as duas certas → sem erros', () => {
    expect(passwordErrors('senhaSegura1', 'senhaSegura1')).toEqual({})
  })

  it('campos vazios ainda não mostram erro (o usuário não digitou)', () => {
    expect(passwordErrors('', '')).toEqual({})
    expect(passwordErrors('senhaSegura1', '')).toEqual({})
  })
})
