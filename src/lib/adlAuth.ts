const COOKIE_NAME = 'adl_session'
const TOKEN_PAYLOAD = 'adl-authenticated'
const SESSION_MS = 60 * 60 * 12 * 1000

function getPassword(): string {
  const password = process.env.ADL_PASSWORD
  if (!password) {
    throw new Error('Missing ADL_PASSWORD.')
  }
  return password
}

function getSigningSecret(): string {
  return process.env.ADL_SECRET || getPassword()
}

async function hmacHex(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

export function getAdlCookieName(): string {
  return COOKIE_NAME
}

export async function createAdlToken(): Promise<string> {
  const expiresAt = String(Date.now() + SESSION_MS)
  const signature = await hmacHex(`${TOKEN_PAYLOAD}.${expiresAt}`, getSigningSecret())
  return `${expiresAt}.${signature}`
}

export async function verifyAdlToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const separator = token.indexOf('.')
  if (separator <= 0) return false
  const expiresAt = token.slice(0, separator)
  const signature = token.slice(separator + 1)
  if (!/^\d{10,16}$/.test(expiresAt) || !/^[a-f0-9]{64}$/.test(signature)) return false
  if (Date.now() > Number(expiresAt)) return false
  try {
    const expected = await hmacHex(`${TOKEN_PAYLOAD}.${expiresAt}`, getSigningSecret())
    return timingSafeEqual(signature, expected)
  } catch {
    return false
  }
}

export async function passwordsMatch(submitted: string): Promise<boolean> {
  if (typeof submitted !== 'string' || submitted.length === 0 || submitted.length > 256) {
    return false
  }
  try {
    const [left, right] = await Promise.all([sha256Hex(submitted), sha256Hex(getPassword())])
    return timingSafeEqual(left, right)
  } catch {
    return false
  }
}

export function getAdlCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_MS / 1000,
  }
}
