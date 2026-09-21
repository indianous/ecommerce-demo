export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM'

export interface ParsedPixKey {
  type: PixKeyType
  /** Chave normalizada, igual à que o backend guarda. */
  value: string
}

export const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  EMAIL: 'E-mail',
  PHONE: 'Telefone',
  RANDOM: 'Chave aleatória',
}

// As regras abaixo espelham `PixKeyValidator` (backend) — mudar um lado exige mudar o outro.
const EMAIL_MAX_LENGTH = 77
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
// +55, DDD (10–99) e número: celular (9 + 8 dígitos) ou fixo (8 dígitos começando em 2–9)
const PHONE = /^\+55[1-9][0-9](9[0-9]{8}|[2-9][0-9]{7})$/

function allSameDigit(digits: string): boolean {
  return new Set(digits).size === 1
}

function cpfCheckDigit(digits: string, length: number, firstWeight: number): number {
  let sum = 0
  for (let i = 0; i < length; i++) sum += Number(digits[i]) * (firstWeight - i)
  return ((sum * 10) % 11) % 10
}

function isValidCpf(digits: string): boolean {
  if (allSameDigit(digits)) return false
  return cpfCheckDigit(digits, 9, 10) === Number(digits[9]) && cpfCheckDigit(digits, 10, 11) === Number(digits[10])
}

function cnpjCheckDigit(digits: string, weights: number[]): number {
  const sum = weights.reduce((acc, weight, i) => acc + Number(digits[i]) * weight, 0)
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

function isValidCnpj(digits: string): boolean {
  if (allSameDigit(digits)) return false
  const first = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const second = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  return cnpjCheckDigit(digits, first) === Number(digits[12]) && cnpjCheckDigit(digits, second) === Number(digits[13])
}

function parseDocument(value: string): ParsedPixKey | null {
  const digits = value.replace(/[\s.\-/]/g, '')
  if (!/^\d+$/.test(digits)) return null
  if (digits.length === 11 && isValidCpf(digits)) return { type: 'CPF', value: digits }
  if (digits.length === 14 && isValidCnpj(digits)) return { type: 'CNPJ', value: digits }
  return null
}

/** Valida e normaliza uma chave PIX (CPF, CNPJ, e-mail, telefone +55… ou aleatória); `null` se inválida. */
export function parsePixKey(raw: string | null | undefined): ParsedPixKey | null {
  const value = raw?.trim()
  if (!value) return null

  if (value.includes('@')) {
    if (value.length > EMAIL_MAX_LENGTH || !EMAIL.test(value)) return null
    return { type: 'EMAIL', value: value.toLowerCase() }
  }
  if (value.startsWith('+')) {
    const normalized = value.replace(/[\s()-]/g, '')
    return PHONE.test(normalized) ? { type: 'PHONE', value: normalized } : null
  }
  if (UUID.test(value)) return { type: 'RANDOM', value: value.toLowerCase() }
  return parseDocument(value)
}
