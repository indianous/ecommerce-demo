import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requiredRole } from '@/lib/route-access'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const required = requiredRole(pathname)
  if (!required) return NextResponse.next()

  const session = request.cookies.get('session')
  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = request.cookies.get('role')?.value
  if (role !== required) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/cart/:path*',
    '/orders/:path*',
    '/profile/:path*',
    '/reviews/:path*',
    '/dashboard/:path*',
    '/products/:path*',
  ],
}
