import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { forwardedForHeader } from '@/lib/client-ip'
import { sessionBody, setSessionCookies } from '@/lib/session-cookies'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const upstream = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...forwardedForHeader(req.headers) },
    body: JSON.stringify(body),
  })

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({ message: 'Erro ao cadastrar' }))
    return NextResponse.json(err, { status: upstream.status })
  }

  const data = await upstream.json()

  setSessionCookies(await cookies(), data)

  return NextResponse.json(sessionBody(data), { status: 201 })
}
