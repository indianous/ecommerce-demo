import { describe, expect, it } from 'vitest'
import { ALL_PERMISSIONS, PERMISSION_LABELS, canSendPasswordInvite } from '../permissions'

describe('permissões', () => {
  it('MANAGE_COUPONS tem rótulo e aparece na lista de permissões atribuíveis', () => {
    expect(PERMISSION_LABELS.MANAGE_COUPONS).toBe('Gestão de Cupons')
    expect(ALL_PERMISSIONS).toContain('MANAGE_COUPONS')
  })

  it('CREATE_ORDERS aparece como "Criar pedidos"', () => {
    expect(PERMISSION_LABELS.CREATE_ORDERS).toBe('Criar pedidos')
    expect(ALL_PERMISSIONS).toContain('CREATE_ORDERS')
  })
})

describe('canSendPasswordInvite', () => {
  it('admin pode para qualquer papel', () => {
    for (const target of ['CUSTOMER', 'EMPLOYEE', 'ADMIN'] as const) {
      expect(canSendPasswordInvite({ role: 'ADMIN', permissions: [] }, target)).toBe(true)
    }
  })

  it('MANAGE_CUSTOMERS só para cliente; MANAGE_EMPLOYEES só para funcionário; admin só por admin', () => {
    const clientes = { role: 'EMPLOYEE' as const, permissions: ['MANAGE_CUSTOMERS' as const] }
    const equipe = { role: 'EMPLOYEE' as const, permissions: ['MANAGE_EMPLOYEES' as const] }

    expect(canSendPasswordInvite(clientes, 'CUSTOMER')).toBe(true)
    expect(canSendPasswordInvite(clientes, 'EMPLOYEE')).toBe(false)
    expect(canSendPasswordInvite(equipe, 'EMPLOYEE')).toBe(true)
    expect(canSendPasswordInvite(equipe, 'ADMIN')).toBe(false)
    expect(canSendPasswordInvite(equipe, 'CUSTOMER')).toBe(false)
  })

  it('sem usuário ou cliente → false', () => {
    expect(canSendPasswordInvite(null, 'CUSTOMER')).toBe(false)
    expect(canSendPasswordInvite({ role: 'CUSTOMER', permissions: [] }, 'CUSTOMER')).toBe(false)
  })
})
