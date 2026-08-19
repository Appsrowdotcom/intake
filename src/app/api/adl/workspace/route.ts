import { NextResponse } from 'next/server'
import { getWorkspace, updateWorkspace } from '@/lib/db'
import { isAllowedOrigin, readJsonBody } from '@/lib/requestGuard'

export async function GET() {
  try {
    const workspace = await getWorkspace()
    return NextResponse.json({ workspace })
  } catch (error) {
    console.error('Failed to get workspace', error)
    return NextResponse.json({ error: 'Could not load workspace.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    if (!isAllowedOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
    const body = await readJsonBody(request)
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status })
    const data = body.value as Record<string, unknown>
    const name = typeof data.name === 'string' ? data.name.trim() : ''
    const domain = typeof data.domain === 'string' ? data.domain.trim() : ''
    if (!name || !domain) return NextResponse.json({ error: 'Name and domain are required.' }, { status: 400 })
    const workspace = await updateWorkspace({
      name,
      domain,
      defaultTheme: (data.defaultTheme as 'light' | 'dark' | 'editorial') || 'light',
    })
    return NextResponse.json({ workspace })
  } catch (error) {
    console.error('Failed to update workspace', error)
    return NextResponse.json({ error: 'Could not update workspace.' }, { status: 500 })
  }
}
