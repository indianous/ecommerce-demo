import type { DemoData } from '../generator/generate'

const MINUTE = 60_000
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
/** Datas sem hora que andam junto (validade de lote). Data de nascimento não anda. */
const SHIFTED_DATE_KEYS = new Set(['expiryDate', 'lotExpiryDate'])

function shiftValue(value: unknown, offset: number, key: string | null): unknown {
  if (typeof value === 'string') {
    if (DATE_TIME.test(value)) return new Date(Date.parse(value) + offset).toISOString()
    if (key && SHIFTED_DATE_KEYS.has(key) && DATE_ONLY.test(value)) {
      return new Date(Date.parse(`${value}T00:00:00Z`) + offset).toISOString().slice(0, 10)
    }
    return value
  }
  if (Array.isArray(value)) return value.map((item) => shiftValue(item, offset, null))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shiftValue(v, offset, k)]))
  }
  return value
}

/** Desloca todas as datas pela diferença entre `now` e o momento da geração (arredondada ao minuto). */
export function shiftData(data: DemoData, now: number): DemoData {
  const offset = Math.round((now - Date.parse(data.generatedAt)) / MINUTE) * MINUTE
  if (offset === 0) return data
  return shiftValue(data, offset, null) as DemoData
}

const cache = new WeakMap<DemoData, { minute: number; shifted: DemoData }>()

/** `shiftData` com cache por minuto: o deslocamento do conjunto inteiro roda no máximo uma vez por minuto. */
export function shiftedData(data: DemoData, now: number): DemoData {
  const minute = Math.round((now - Date.parse(data.generatedAt)) / MINUTE)
  const hit = cache.get(data)
  if (hit && hit.minute === minute) return hit.shifted
  const shifted = shiftData(data, now)
  cache.set(data, { minute, shifted })
  return shifted
}
