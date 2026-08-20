import { describe, expect, it } from 'vitest'
import { proxyJson, safeJson } from '@/lib/api-proxy'

describe('safeJson', () => {
  it('faz parse do corpo quando há JSON válido', async () => {
    const res = new Response(JSON.stringify({ message: 'ok' }))
    await expect(safeJson(res)).resolves.toEqual({ message: 'ok' })
  })

  it('retorna null quando o corpo está vazio', async () => {
    const res = new Response(null, { status: 401 })
    await expect(safeJson(res)).resolves.toBeNull()
  })

  it('retorna null quando o corpo não é JSON válido', async () => {
    const res = new Response('not json')
    await expect(safeJson(res)).resolves.toBeNull()
  })
})

describe('proxyJson', () => {
  it('repassa status e corpo quando a resposta upstream é ok', async () => {
    const res = new Response(JSON.stringify({ id: '1' }), { status: 200 })
    const result = await proxyJson(res)
    expect(result.status).toBe(200)
    await expect(result.json()).resolves.toEqual({ id: '1' })
  })

  it('repassa status de erro sem lançar quando o corpo está vazio (ex.: 401 do filtro de segurança)', async () => {
    const res = new Response(null, { status: 401 })
    const result = await proxyJson(res)
    expect(result.status).toBe(401)
  })

  it('retorna 204 sem corpo quando a resposta upstream é 204', async () => {
    const res = new Response(null, { status: 204 })
    const result = await proxyJson(res)
    expect(result.status).toBe(204)
  })
})
