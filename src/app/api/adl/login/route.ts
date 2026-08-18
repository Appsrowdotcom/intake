import { NextResponse } from 'next/server'
import { createAdlToken, getAdlCookieName, getAdlCookieOptions, passwordsMatch } from '@/lib/adlAuth'
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rateLimit'
import { isAllowedOrigin, readJsonBody } from '@/lib/requestGuard'

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
    }

    const limited = rateLimit(`adl-login:${clientIp(request)}`, 5, 10 * 60 * 1000)
    if (!limited.ok) {
      return NextResponse.json(tooManyRequests(limited.retryAfterSec), {
        status: 429,
        headers: { 'Retry-After': String(limited.retryAfterSec) },
      })
    }

    const body = await readJsonBody(request, 2000)
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: body.status })
    }

    const password =
      body.value && typeof body.value === 'object' && !Array.isArray(body.value)
        ? (body.value as { password?: unknown }).password
        : ''

    if (!(await passwordsMatch(typeof password === 'string' ? password : ''))) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(getAdlCookieName(), await createAdlToken(), getAdlCookieOptions())
    return response
  } catch (error) {
    console.error('ADL login failed', error)
    return NextResponse.json({ error: 'Could not verify the password.' }, { status: 500 })
  }
}
