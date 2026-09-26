import { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'
import { forwardedForHeader } from '@/lib/client-ip'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

/** Configuração obrigatória da equipe: devolve o segredo e o otpauth:// do QR code. */
export async function POST(req: NextRequest) {
  const upstream = await fetch(`${API}/auth/mfa/setup/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...forwardedForHeader(req.headers) },
    body: JSON.stringify(await req.json()),
  })
  return proxyJson(upstream)
}
