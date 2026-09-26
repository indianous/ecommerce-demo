/** Mesma regra do backend (PasswordPolicy): usada no cadastro, na troca, na redefinição e no cadastro da equipe. */
export const MIN_PASSWORD_LENGTH = 8

export const PASSWORD_TOO_SHORT = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`
export const PASSWORDS_DONT_MATCH = 'As senhas não coincidem'

export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH
}

/** Erros a mostrar enquanto a pessoa digita. Campo vazio ainda não é erro. */
export function passwordErrors(password: string, confirm: string): { password?: string; confirm?: string } {
  if (password && !isValidPassword(password)) return { password: PASSWORD_TOO_SHORT }
  if (confirm && password !== confirm) return { confirm: PASSWORDS_DONT_MATCH }
  return {}
}
