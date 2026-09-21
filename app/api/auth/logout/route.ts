import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function POST() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('session')?.value

  // Revoga o refresh token no backend; se falhar, o usuário ainda sai deste navegador.
  if (refreshToken) {
    await fetch(`${API}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {})
  }

  cookieStore.delete('session')
  cookieStore.delete('role')
  return new NextResponse(null, { status: 204 })
}
