import { NextResponse } from 'next/server'
import { updateQuestion, deleteQuestion } from '@/lib/db'
import { isAllowedOrigin, readJsonBody } from '@/lib/requestGuard'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isAllowedOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
    const { id } = await params
    const body = await readJsonBody(request)
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status })
    const data = body.value as Record<string, unknown>
    const question = await updateQuestion(id, data as Parameters<typeof updateQuestion>[1])
    if (!question) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    return NextResponse.json({ question })
  } catch (error) {
    console.error('Failed to update question', error)
    return NextResponse.json({ error: 'Could not update question.' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteQuestion(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete question', error)
    return NextResponse.json({ error: 'Could not delete question.' }, { status: 500 })
  }
}
