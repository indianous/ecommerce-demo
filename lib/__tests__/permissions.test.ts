import { describe, expect, it } from 'vitest'
import {
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  canEditPermissions,
  canResetMfa,
  canSendPasswordInvite,
  editablePermissions,
} from '../permissions'

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

describe('canResetMfa', () => {
  const admin = { id: 'a-1', role: 'ADMIN' as const, permissions: [] }
  const clientes = { id: 'e-1', role: 'EMPLOYEE' as const, permissions: ['MANAGE_CUSTOMERS' as const] }
  const equipe = { id: 'e-2', role: 'EMPLOYEE' as const, permissions: ['MANAGE_EMPLOYEES' as const] }

  it('admin reseta cliente, funcionário e outro admin, mas não a si mesmo', () => {
    expect(canResetMfa(admin, { id: 'c-1', role: 'CUSTOMER' })).toBe(true)
    expect(canResetMfa(admin, { id: 'e-9', role: 'EMPLOYEE' })).toBe(true)
    expect(canResetMfa(admin, { id: 'a-2', role: 'ADMIN' })).toBe(true)
    expect(canResetMfa(admin, { id: 'a-1', role: 'ADMIN' })).toBe(false)
  })

  it('MANAGE_CUSTOMERS só reseta cliente; MANAGE_EMPLOYEES não reseta ninguém da equipe', () => {
    expect(canResetMfa(clientes, { id: 'c-1', role: 'CUSTOMER' })).toBe(true)
    expect(canResetMfa(clientes, { id: 'e-9', role: 'EMPLOYEE' })).toBe(false)
    expect(canResetMfa(equipe, { id: 'e-9', role: 'EMPLOYEE' })).toBe(false)
    expect(canResetMfa(equipe, { id: 'c-1', role: 'CUSTOMER' })).toBe(false)
  })

  it('sem usuário ou cliente → false', () => {
    expect(canResetMfa(null, { id: 'c-1', role: 'CUSTOMER' })).toBe(false)
    expect(canResetMfa({ id: 'c-2', role: 'CUSTOMER', permissions: [] }, { id: 'c-1', role: 'CUSTOMER' })).toBe(false)
  })
})

describe('edição de permissões (plano 71: sem autoconcessão)', () => {
  const colega = { id: 'emp-2', role: 'EMPLOYEE' as const }
  const admin = { id: 'adm-1', role: 'ADMIN' as const, permissions: [] }
  const gestor = {
    id: 'emp-1',
    role: 'EMPLOYEE' as const,
    permissions: ['MANAGE_EMPLOYEES' as const, 'MANAGE_ORDERS' as const],
  }

  it('editablePermissions: admin → todas; funcionário → só as que tem; próprio perfil → nenhuma', () => {
    expect(editablePermissions(admin, colega)).toEqual(ALL_PERMISSIONS)
    expect(editablePermissions(gestor, colega)).toEqual(['MANAGE_ORDERS', 'MANAGE_EMPLOYEES'])
    expect(editablePermissions(gestor, { id: 'emp-1', role: 'EMPLOYEE' })).toEqual([])
    expect(editablePermissions(null, colega)).toEqual([])
  })

  it('canEditPermissions: false no próprio perfil e sem MANAGE_EMPLOYEES; true para admin', () => {
    expect(canEditPermissions(admin, colega)).toBe(true)
    expect(canEditPermissions(gestor, colega)).toBe(true)
    expect(canEditPermissions(gestor, { id: 'emp-1', role: 'EMPLOYEE' })).toBe(false)
    expect(canEditPermissions({ ...gestor, permissions: ['MANAGE_ORDERS'] }, colega)).toBe(false)
    expect(canEditPermissions(null, colega)).toBe(false)
  })
})
