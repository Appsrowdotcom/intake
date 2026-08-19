import { NextResponse } from 'next/server'
import { addQuestion } from '@/lib/db'
import { isAllowedOrigin, readJsonBody } from '@/lib/requestGuard'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isAllowedOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
    const { id: _questionnaireId } = await params
    const body = await readJsonBody(request)
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status })
    const data = body.value as Record<string, unknown>
    const sectionId = typeof data.sectionId === 'string' ? data.sectionId : ''
    if (!sectionId) return NextResponse.json({ error: 'sectionId is required.' }, { status: 400 })
    const question = await addQuestion(sectionId, data as Parameters<typeof addQuestion>[1])
    return NextResponse.json({ question })
  } catch (error) {
    console.error('Failed to add question', error)
    return NextResponse.json({ error: 'Could not add question.' }, { status: 500 })
  }
}
