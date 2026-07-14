import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const upstream = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({ message: 'Erro ao cadastrar' }))
    return NextResponse.json(err, { status: upstream.status })
  }

  const data = await upstream.json()

  const cookieStore = await cookies()
  cookieStore.set('session', data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return NextResponse.json(
    { accessToken: data.accessToken, tokenType: data.tokenType, expiresIn: data.expiresIn },
    { status: 201 }
  )
}
