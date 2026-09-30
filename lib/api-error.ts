/**
 * Mensagem de erro para o toast a partir do ApiError do backend. O erro de validação vem como
 * "Validation failed" com o motivo em `errors` ("campo: mensagem"); aí vale o primeiro motivo, sem o campo.
 */
export async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { message?: string; errors?: string[] } | null
  const firstError = body?.errors?.[0]
  if (firstError) return firstError.replace(/^[^:]+:\s*/, '')
  if (body?.message && body.message !== 'Validation failed') return body.message
  return fallback
}
