import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const CUSTOMER_ROUTES = ['/cart', '/orders', '/profile']
const EMPLOYEE_ROUTES = ['/dashboard', '/products']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isCustomerRoute = CUSTOMER_ROUTES.some((r) => pathname.startsWith(r))
  const isEmployeeRoute = EMPLOYEE_ROUTES.some((r) => pathname.startsWith(r))

  if (!isCustomerRoute && !isEmployeeRoute) return NextResponse.next()

  const session = request.cookies.get('session')
  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isEmployeeRoute) {
    const role = request.cookies.get('role')?.value
    if (role !== 'EMPLOYEE') {
      return NextResponse.redirect(new URL('/', request.url))
    }
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
