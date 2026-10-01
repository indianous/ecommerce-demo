/** Página no formato do `PageResponse` do backend. */
export function paginate<T>(list: T[], query: URLSearchParams, defaultSize = 20) {
  const page = Math.max(0, Number.parseInt(query.get('page') ?? '0', 10) || 0)
  const size = Math.min(1000, Math.max(1, Number.parseInt(query.get('size') ?? String(defaultSize), 10) || defaultSize))
  const totalPages = Math.ceil(list.length / size)
  return {
    content: list.slice(page * size, page * size + size),
    page,
    size,
    totalElements: list.length,
    totalPages,
    last: page >= totalPages - 1,
  }
}

/** Valores de um parâmetro repetido (`?status=A&status=B`) ou separado por vírgula (`?status=A,B`). */
export function multi(query: URLSearchParams, name: string): string[] {
  return query.getAll(name).flatMap((value) => value.split(',')).map((v) => v.trim()).filter(Boolean)
}

export function bool(query: URLSearchParams, name: string): boolean | null {
  const value = query.get(name)
  return value === 'true' ? true : value === 'false' ? false : null
}

export const contains = (haystack: string | null | undefined, needle: string) =>
  (haystack ?? '').toLocaleLowerCase('pt-BR').includes(needle.toLocaleLowerCase('pt-BR'))

/** Instante [início, fim] de um período `from`/`to` (datas ISO), com padrão dos últimos `defaultDays` dias. */
export function period(query: URLSearchParams, now: number, defaultDays = 30): [number, number] {
  const today = new Date(now).toISOString().slice(0, 10)
  const to = query.get('to') || today
  const from = query.get('from') || new Date(Date.parse(`${to}T00:00:00Z`) - defaultDays * 86_400_000).toISOString().slice(0, 10)
  return [Date.parse(`${from}T00:00:00Z`), Date.parse(`${to}T23:59:59.999Z`)]
}
