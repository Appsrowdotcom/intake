const MAX_JSON_BYTES = 80_000

export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) {
    return process.env.NODE_ENV !== 'production'
  }
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export function hasJsonContentType(request: Request): boolean {
  const value = request.headers.get('content-type') || ''
  return value.toLowerCase().includes('application/json')
}

export async function readJsonBody(
  request: Request,
  maxBytes = MAX_JSON_BYTES
): Promise<{ ok: true; value: unknown } | { ok: false; status: number; error: string }> {
  if (!hasJsonContentType(request)) {
    return { ok: false, status: 415, error: 'JSON body required.' }
  }

  const text = await request.text()
  if (text.length > maxBytes) {
    return { ok: false, status: 413, error: 'Request is too large.' }
  }

  try {
    return { ok: true, value: JSON.parse(text) as unknown }
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON.' }
  }
}

export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-DNS-Prefetch-Control': 'off',
  'Content-Security-Policy':
    "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'",
}

export function applySecurityHeaders(headers: Headers) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value)
  }
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
}

export const SUBMISSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const QUESTION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
