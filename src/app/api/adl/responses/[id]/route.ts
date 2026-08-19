import { NextResponse } from 'next/server'
import { getResponse, updateResponseStatus } from '@/lib/db'
import { isAllowedOrigin, readJsonBody } from '@/lib/requestGuard'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const response = await getResponse(id)
    if (!response) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    return NextResponse.json({ response })
  } catch (error) {
    console.error('Failed to get response', error)
    return NextResponse.json({ error: 'Could not load response.' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isAllowedOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
    const { id } = await params
    const body = await readJsonBody(request)
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status })
    const data = body.value as Record<string, unknown>
    const status = data.status as 'new' | 'reviewed'
    if (status !== 'new' && status !== 'reviewed') {
      return NextResponse.json({ error: 'Status must be new or reviewed.' }, { status: 400 })
    }
    await updateResponseStatus(id, status)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to update response', error)
    return NextResponse.json({ error: 'Could not update response.' }, { status: 500 })
  }
}
