import { describe, expect, it } from 'vitest'
import { isValidCpf } from '../cpf'

describe('isValidCpf', () => {
  it.each(['52998224725', '529.982.247-25', '111.444.777-35'])('%s é válido', (cpf) => {
    expect(isValidCpf(cpf)).toBe(true)
  })

  it.each(['52998224724', '11111111111', '1234567890', '529982247250', 'abc', ''])('%s é inválido', (cpf) => {
    expect(isValidCpf(cpf)).toBe(false)
  })
})
