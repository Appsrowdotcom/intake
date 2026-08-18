import { NextResponse } from 'next/server'
import { getAdlCookieName, getAdlCookieOptions } from '@/lib/adlAuth'
import { isAllowedOrigin } from '@/lib/requestGuard'

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(getAdlCookieName(), '', { ...getAdlCookieOptions(), maxAge: 0 })
  return response
}
