import { describe, expect, it } from 'vitest'
import { apiErrorMessage } from '../api-error'

const json = (body: unknown, status = 400) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('apiErrorMessage', () => {
  it('erro de validação: usa o primeiro item de errors, sem o nome do campo', async () => {
    const res = json({ status: 400, message: 'Validation failed', errors: ['instagramUrl: Link inválido. Use http://'] })
    expect(await apiErrorMessage(res, 'Erro ao salvar.')).toBe('Link inválido. Use http://')
  })

  it('erro com mensagem própria: usa o message', async () => {
    const res = json({ status: 403, message: 'Permissão MANAGE_SITE necessária' }, 403)
    expect(await apiErrorMessage(res, 'Erro ao salvar.')).toBe('Permissão MANAGE_SITE necessária')
  })

  it('"Validation failed" sem errors, ou corpo que não é JSON: usa o texto padrão', async () => {
    expect(await apiErrorMessage(json({ status: 400, message: 'Validation failed' }), 'Erro ao salvar.')).toBe('Erro ao salvar.')
    expect(await apiErrorMessage(new Response('oops', { status: 500 }), 'Erro ao salvar.')).toBe('Erro ao salvar.')
  })
})
