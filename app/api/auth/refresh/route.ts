import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function POST() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('session')?.value

  if (!refreshToken) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
  }

  const upstream = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!upstream.ok) {
    cookieStore.delete('session')
    return NextResponse.json({ message: 'Sessão expirada' }, { status: 401 })
  }

  const data = await upstream.json()

  cookieStore.set('session', data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  cookieStore.set('role', data.role ?? 'CUSTOMER', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return NextResponse.json({
    accessToken: data.accessToken,
    tokenType: data.tokenType,
    expiresIn: data.expiresIn,
    role: data.role,
  })
}
