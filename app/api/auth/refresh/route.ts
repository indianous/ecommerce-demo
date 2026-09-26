import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { forwardedForHeader } from '@/lib/client-ip'
import { sessionBody, setSessionCookies } from '@/lib/session-cookies'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('session')?.value

  if (!refreshToken) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
  }

  const upstream = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...forwardedForHeader(req.headers) },
    body: JSON.stringify({ refreshToken }),
  })

  if (!upstream.ok) {
    cookieStore.delete('session')
    cookieStore.delete('role')
    return NextResponse.json({ message: 'Sessão expirada' }, { status: 401 })
  }

  const data = await upstream.json()

  // O backend só devolve um refresh token novo quando rotaciona. Dentro da janela de tolerância
  // (outra aba acabou de renovar) ele vem nulo — o cookie que a outra aba gravou continua valendo.
  setSessionCookies(cookieStore, data)

  return NextResponse.json(sessionBody(data))
}
