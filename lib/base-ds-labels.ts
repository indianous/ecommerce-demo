import type { FilterDropdownProps, MultiSelectProps } from '@indianous/base-ds'

// Desde a 0.5.0, os textos próprios desses componentes do base-ds têm padrão em inglês (plano #78).

export const FILTER_DROPDOWN_LABELS = {
  selectAllLabel: 'Selecionar todos',
  clearLabel: 'Limpar',
  applyLabel: 'Aplicar',
} as const satisfies Pick<FilterDropdownProps, 'selectAllLabel' | 'clearLabel' | 'applyLabel'>

export const MULTI_SELECT_LABELS = {
  emptyMessage: 'Nenhum resultado',
} as const satisfies Pick<MultiSelectProps, 'emptyMessage'>
