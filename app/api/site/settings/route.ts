import { proxyJson } from '@/lib/api-proxy'
const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function GET() {
  const res = await fetch(`${API}/site/settings`)
  return proxyJson(res)
}
