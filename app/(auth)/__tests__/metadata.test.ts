import { describe, expect, it } from 'vitest'
import { metadata as loginMetadata } from '../login/page'
import { metadata as registerMetadata } from '../register/page'

describe('(auth) — metadata.title', () => {
  it.each([
    ['login/page.tsx', loginMetadata, 'Entrar'],
    ['register/page.tsx', registerMetadata, 'Cadastro'],
  ])('%s exporta title %s', (_name, metadata, expectedTitle) => {
    expect(metadata.title).toBe(expectedTitle)
  })
})
