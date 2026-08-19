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

  if (pathname.startsWith('/api/adl') || pathname.startsWith('/adl')) {
    if (pathname === '/adl' && request.method === 'GET') {
      return response
    }

    const token = request.cookies.get(getAdlCookieName())?.value
    if (!(await verifyAdlToken(token))) {
      if (pathname.startsWith('/api/')) {
        const unauthorized = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        applySecurityHeaders(unauthorized.headers)
        return unauthorized
      }
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/adl'
      const redirect = NextResponse.redirect(loginUrl)
      applySecurityHeaders(redirect.headers)
      return redirect
    }
  }

  return response
}

export const config = {
  matcher: ['/adl', '/adl/:path*', '/api/:path*', '/', '/q/:path*'],
}
