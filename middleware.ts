import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const CUSTOMER_ROUTES = ['/cart', '/orders', '/profile']
const EMPLOYEE_ROUTES = ['/dashboard', '/products']
const ADMIN_ROUTES = ['/dashboard/admin']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isCustomerRoute = CUSTOMER_ROUTES.some((r) => pathname.startsWith(r))
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r))
  // Admin routes are a subset of employee routes — check admin first
  const isEmployeeRoute = !isAdminRoute && EMPLOYEE_ROUTES.some((r) => pathname.startsWith(r))

  if (!isCustomerRoute && !isEmployeeRoute && !isAdminRoute) return NextResponse.next()

  const session = request.cookies.get('session')
  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = request.cookies.get('role')?.value

  if (isAdminRoute && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (isEmployeeRoute && role !== 'EMPLOYEE') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/cart/:path*',
    '/orders/:path*',
    '/profile/:path*',
    '/dashboard/:path*',
    '/products/:path*',
  ],
}
