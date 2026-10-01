import { FIXED_ACCOUNTS } from '../generator/generate'
import { userFromToken } from '../fake-backend/auth'
import { asCustomer, body, call, data, fixedCustomer, tokenFor } from './fake-backend-helpers'

describe('POST /auth/login', () => {
  it.each(Object.values(FIXED_ACCOUNTS))('$email entra com qualquer senha e recebe a sessão de $role', ({ email, role }) => {
    const response = call('POST', '/auth/login', { body: { email, password: 'qualquer-coisa' } })
    expect(response.status).toBe(200)
    expect(body(response)).toMatchObject({ tokenType: 'Bearer', role, expiresIn: expect.any(Number) })
    expect(body(response).accessToken).toMatch(/^demo\./)
    expect(body(response).refreshToken).toMatch(/^demo\./)
    expect(body(response).mfaRequired).toBeFalsy()
    expect(body(response).mfaSetupRequired).toBeFalsy()
  })

  it('ignora maiúsculas no e-mail', () => {
    expect(call('POST', '/auth/login', { body: { email: 'ADMIN@demo.com', password: 'x' } }).status).toBe(200)
  })

  it('qualquer usuário gerado também entra', () => {
    const generated = data.users.find((u) => u.role === 'CUSTOMER' && u.email !== FIXED_ACCOUNTS.customer.email)!
    expect(call('POST', '/auth/login', { body: { email: generated.email, password: 'x' } }).status).toBe(200)
  })

  it('e-mail desconhecido → 401 com a mensagem do backend', () => {
    const response = call('POST', '/auth/login', { body: { email: 'ninguem@demo.com', password: 'x' } })
    expect(response.status).toBe(401)
    expect(body(response)).toEqual({ message: 'Credenciais inválidas', status: 401 })
  })

  it('senha vazia → 401', () => {
    expect(call('POST', '/auth/login', { body: { email: FIXED_ACCOUNTS.admin.email, password: '' } }).status).toBe(401)
  })
})

describe('POST /auth/refresh', () => {
  it('refresh token válido devolve um access token novo do mesmo usuário, sem girar o refresh', () => {
    const login = body(call('POST', '/auth/login', { body: { email: FIXED_ACCOUNTS.customer.email, password: 'x' } }))
    const response = call('POST', '/auth/refresh', { body: { refreshToken: login.refreshToken } })
    expect(response.status).toBe(200)
    expect(body(response).role).toBe('CUSTOMER')
    expect(body(response).refreshToken).toBeNull()
    expect(userFromToken(body(response).accessToken, data)?.email).toBe(FIXED_ACCOUNTS.customer.email)
  })

  it('refresh token inválido → 401', () => {
    expect(call('POST', '/auth/refresh', { body: { refreshToken: 'demo.nao-existe.x' } }).status).toBe(401)
    expect(call('POST', '/auth/refresh', { body: {} }).status).toBe(401)
  })
})

describe('userFromToken', () => {
  it('lê o usuário do token demo.<id>.<x>', () => {
    expect(userFromToken(tokenFor(fixedCustomer().id), data)?.id).toBe(fixedCustomer().id)
  })

  it.each([undefined, '', 'Bearer', 'abc', 'demo.', 'outro.123.x', 'demo.nao-existe.x'])('token %j → anônimo', (token) => {
    expect(userFromToken(token, data)).toBeNull()
  })
})

describe('demais rotas de autenticação', () => {
  it('logout responde 204', () => {
    expect(call('POST', '/auth/logout', { body: {} }).status).toBe(204)
  })

  it('cadastro abre a sessão do cliente fixo (nada é gravado)', () => {
    const response = call('POST', '/auth/register', { body: { name: 'Nova Pessoa', email: 'nova@example.com', password: 'x' } })
    expect(response.status).toBe(200)
    expect(userFromToken(body(response).accessToken, data)?.email).toBe(FIXED_ACCOUNTS.customer.email)
  })

  it.each(['/auth/forgot-password', '/auth/reset-password', '/auth/verify-email'])('%s responde 204', (path) => {
    expect(call('POST', path, { body: {} }).status).toBe(204)
  })

  it('reenvio da verificação de e-mail exige login e responde 204', () => {
    expect(call('POST', '/auth/verify-email/resend').status).toBe(401)
    expect(call('POST', '/auth/verify-email/resend', asCustomer).status).toBe(204)
  })

  it('link de senha não existe na demo → 404', () => {
    expect(call('GET', '/auth/password-tokens/qualquer').status).toBe(404)
  })
})
