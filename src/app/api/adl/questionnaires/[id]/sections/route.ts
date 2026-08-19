import { NextResponse } from 'next/server'
import { addSection } from '@/lib/db'
import { isAllowedOrigin, readJsonBody } from '@/lib/requestGuard'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isAllowedOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
    const { id } = await params
    const body = await readJsonBody(request)
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status })
    const data = body.value as Record<string, unknown>
    const title = typeof data.title === 'string' ? data.title.trim() : ''
    if (!title) return NextResponse.json({ error: 'Section title is required.' }, { status: 400 })
    const section = await addSection(id, title)
    return NextResponse.json({ section })
  } catch (error) {
    console.error('Failed to add section', error)
    return NextResponse.json({ error: 'Could not add section.' }, { status: 500 })
  }
}
