import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../auth.store'
import { selectStorefrontSession, useStorefrontSession } from '../storefront-session'
import type { User, UserRole } from '@/types'

const userWith = (role: UserRole): User => ({
  id: 'u-1', name: 'Pessoa', email: 'p@test.com', role, permissions: [],
  phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER', cpf: null,
})

afterEach(async () => {
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})

function loginAs(role: UserRole) {
  useAuthStore.setState({ accessToken: 'tok', user: userWith(role), role, isAuthenticated: true })
}

const anonymous = { isAuthenticated: false, accessToken: null, user: null }

describe('selectStorefrontSession', () => {
  it('CUSTOMER → a sessão como está', () => {
    loginAs('CUSTOMER')
    expect(selectStorefrontSession(useAuthStore.getState())).toEqual({
      isAuthenticated: true,
      accessToken: 'tok',
      user: userWith('CUSTOMER'),
    })
  })

  it.each([['ADMIN' as const], ['EMPLOYEE' as const]])('%s → visitante (a loja não vê a sessão da equipe)', (role) => {
    loginAs(role)
    expect(selectStorefrontSession(useAuthStore.getState())).toEqual(anonymous)
  })

  it('visitante → visitante', () => {
    expect(selectStorefrontSession(useAuthStore.getState())).toEqual(anonymous)
  })
})

describe('useStorefrontSession', () => {
  it('acompanha o store: equipe → visitante; cliente → sessão', () => {
    const { result } = renderHook(() => useStorefrontSession())
    expect(result.current).toEqual(anonymous)

    act(() => loginAs('ADMIN'))
    expect(result.current).toEqual(anonymous)

    act(() => loginAs('CUSTOMER'))
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.accessToken).toBe('tok')
  })
})
