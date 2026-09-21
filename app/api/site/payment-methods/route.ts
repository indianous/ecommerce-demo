import { proxyJson } from '@/lib/api-proxy'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

/** Formas de pagamento aceitas por tipo de entrega — público, o checkout consulta antes de logar. */
export async function GET() {
  const res = await fetch(`${API}/site/payment-methods`)
  return proxyJson(res)
}
