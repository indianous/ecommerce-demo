import { describe, expect, it } from 'vitest'
import { metadata as loginMetadata } from '../login/page'
import { metadata as registerMetadata } from '../register/page'
import { metadata as forgotPasswordMetadata } from '../forgot-password/page'
import { metadata as resetPasswordMetadata } from '../reset-password/page'
import { metadata as verifyEmailMetadata } from '../verify-email/page'

describe('(auth) — metadata.title', () => {
  it.each([
    ['login/page.tsx', loginMetadata, 'Entrar'],
    ['register/page.tsx', registerMetadata, 'Cadastro'],
    ['forgot-password/page.tsx', forgotPasswordMetadata, 'Esqueci minha senha'],
    ['reset-password/page.tsx', resetPasswordMetadata, 'Definir senha'],
    ['verify-email/page.tsx', verifyEmailMetadata, 'Confirmar e-mail'],
  ])('%s exporta title %s', (_name, metadata, expectedTitle) => {
    expect(metadata.title).toBe(expectedTitle)
  })
})

describe('(auth) — páginas com token na URL não vazam o link', () => {
  it.each([
    ['forgot-password/page.tsx', forgotPasswordMetadata],
    ['reset-password/page.tsx', resetPasswordMetadata],
    ['verify-email/page.tsx', verifyEmailMetadata],
  ])('%s: referrer no-referrer e fora da indexação', (_name, metadata) => {
    expect(metadata.referrer).toBe('no-referrer')
    expect(metadata.robots).toEqual({ index: false })
  })
})
