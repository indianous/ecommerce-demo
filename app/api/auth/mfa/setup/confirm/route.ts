import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { safeJson } from '@/lib/api-proxy'
import { forwardedForHeader } from '@/lib/client-ip'
import { sessionBody, setSessionCookies } from '@/lib/session-cookies'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

/** Fim da configuração obrigatória: grava a sessão e devolve os códigos de recuperação (mostrados uma vez). */
export async function POST(req: NextRequest) {
  const upstream = await fetch(`${API}/auth/mfa/setup/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...forwardedForHeader(req.headers) },
    body: JSON.stringify(await req.json()),
  })

  const data = await safeJson<Record<string, unknown>>(upstream)
  if (!upstream.ok || !data) {
    return NextResponse.json(data, { status: upstream.status })
  }

  setSessionCookies(await cookies(), data)
  return NextResponse.json({ ...sessionBody(data), recoveryCodes: data.recoveryCodes })
}
