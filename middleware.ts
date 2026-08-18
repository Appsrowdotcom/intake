import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAdlCookieName, verifyAdlToken } from '@/lib/adlAuth'
import { applySecurityHeaders } from '@/lib/requestGuard'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()
  applySecurityHeaders(response.headers)

  if (pathname === '/api/adl/login' || pathname === '/api/adl/logout') {
    return response
  }

  if (pathname.startsWith('/api/adl')) {
    const token = request.cookies.get(getAdlCookieName())?.value
    if (!(await verifyAdlToken(token))) {
      const unauthorized = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      applySecurityHeaders(unauthorized.headers)
      return unauthorized
    }
  }

  return response
}

export const config = {
  matcher: ['/adl', '/adl/:path*', '/api/:path*', '/'],
}
