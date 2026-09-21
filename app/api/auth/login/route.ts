import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { forwardedForHeader } from '@/lib/client-ip'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const upstream = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...forwardedForHeader(req.headers) },
    body: JSON.stringify(body),
  })

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({ message: 'Credenciais inválidas' }))
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
  // Non-sensitive role cookie read by the Edge middleware for route protection
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
