import { cookies } from 'next/headers'
import { getAdlCookieName, verifyAdlToken } from '@/lib/adlAuth'

export async function isAdlAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  return verifyAdlToken(cookieStore.get(getAdlCookieName())?.value)
}
