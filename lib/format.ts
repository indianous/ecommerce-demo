export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

/**
 * Exibe um LocalDateTime do backend ("2026-09-30T23:59:00") como "30/09/2026 23:59". Só recorta o texto:
 * o backend manda a hora sem fuso, e converter com Date aplicaria o fuso do navegador.
 */
export function formatLocalDateTime(value: string | null | undefined): string {
  const m = value ? LOCAL_DATE_TIME.exec(value) : null
  if (!m) return '—'
  const [, year, month, day, hour, minute] = m
  return `${day}/${month}/${year} ${hour}:${minute}`
}

/** Valor para um `<input type="datetime-local">` ("2026-09-30T23:59") a partir de um LocalDateTime do backend. */
export function toDateTimeLocalValue(value: string | null | undefined): string {
  return value ? value.slice(0, 16) : ''
}
