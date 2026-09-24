// Espelha `shared/Cpf` (backend) — mudar um lado exige mudar o outro.

function checkDigit(digits: string, length: number, firstWeight: number): number {
  let sum = 0
  for (let i = 0; i < length; i++) sum += Number(digits[i]) * (firstWeight - i)
  return ((sum * 10) % 11) % 10
}

/** CPF pelos dígitos verificadores, com ou sem máscara (`000.000.000-00`). */
export function isValidCpf(raw: string): boolean {
  const digits = raw.trim().replace(/[\s.-]/g, '')
  if (!/^\d{11}$/.test(digits)) return false
  if (new Set(digits).size === 1) return false
  return checkDigit(digits, 9, 10) === Number(digits[9]) && checkDigit(digits, 10, 11) === Number(digits[10])
}
