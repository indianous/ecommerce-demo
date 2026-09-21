import { afterEach, describe, expect, it, vi } from 'vitest'
import { forwardedForHeader } from '../client-ip'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('forwardedForHeader', () => {
  it('não repassa nada por padrão (cabeçalhos do cliente não são confiáveis)', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.9' })

    expect(forwardedForHeader(headers)).toEqual({})
  })

  it('com TRUST_PROXY_HEADERS usa a última entrada de X-Forwarded-For (a que o proxy acrescentou)', () => {
    vi.stubEnv('TRUST_PROXY_HEADERS', 'true')
    const headers = new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' })

    expect(forwardedForHeader(headers)).toEqual({ 'X-Forwarded-For': '203.0.113.9' })
  })

  it('com TRUST_PROXY_HEADERS cai para X-Real-IP quando não há X-Forwarded-For', () => {
    vi.stubEnv('TRUST_PROXY_HEADERS', 'true')
    const headers = new Headers({ 'x-real-ip': '198.51.100.7' })

    expect(forwardedForHeader(headers)).toEqual({ 'X-Forwarded-For': '198.51.100.7' })
  })

  it('com TRUST_PROXY_HEADERS mas sem nenhum cabeçalho de IP, não repassa nada', () => {
    vi.stubEnv('TRUST_PROXY_HEADERS', 'true')

    expect(forwardedForHeader(new Headers())).toEqual({})
  })
})
