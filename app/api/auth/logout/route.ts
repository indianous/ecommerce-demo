import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
  cookieStore.delete('role')
  return new NextResponse(null, { status: 204 })
}
