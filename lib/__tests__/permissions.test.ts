import { describe, expect, it } from 'vitest'
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '../permissions'

describe('permissões', () => {
  it('MANAGE_COUPONS tem rótulo e aparece na lista de permissões atribuíveis', () => {
    expect(PERMISSION_LABELS.MANAGE_COUPONS).toBe('Gestão de Cupons')
    expect(ALL_PERMISSIONS).toContain('MANAGE_COUPONS')
  })
})
