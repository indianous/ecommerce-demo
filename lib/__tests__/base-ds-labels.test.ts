import { describe, expect, it } from 'vitest'
import { FILTER_DROPDOWN_LABELS, MULTI_SELECT_LABELS } from '../base-ds-labels'

describe('base-ds-labels', () => {
  it('FILTER_DROPDOWN_LABELS traz os botões do painel do filtro em português', () => {
    expect(FILTER_DROPDOWN_LABELS).toEqual({
      selectAllLabel: 'Selecionar todos',
      clearLabel: 'Limpar',
      applyLabel: 'Aplicar',
    })
  })

  it('MULTI_SELECT_LABELS traz a mensagem de lista vazia em português', () => {
    expect(MULTI_SELECT_LABELS).toEqual({ emptyMessage: 'Nenhum resultado' })
  })
})
