/**
 * Cabeçalho `X-Forwarded-For` a enviar ao backend para o rate limit por IP.
 *
 * O backend só enxerga o IP do servidor Next; sem repassar o do cliente, todo mundo divide o
 * mesmo bucket. Mas `X-Forwarded-For` é forjável pelo cliente, então só é confiável atrás de um
 * proxy nosso: com `TRUST_PROXY_HEADERS=true` usamos a última entrada (a que o proxy acrescentou,
 * não as que o cliente mandou); sem a variável, nada é repassado.
 */
export function forwardedForHeader(headers: Headers): Record<string, string> {
  if (process.env.TRUST_PROXY_HEADERS !== 'true') return {}

  const forwarded = headers.get('x-forwarded-for')?.split(',').pop()?.trim()
  const ip = forwarded || headers.get('x-real-ip')?.trim()
  return ip ? { 'X-Forwarded-For': ip } : {}
}
