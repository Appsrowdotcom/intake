import { NextResponse } from 'next/server'
import { deleteQuestion, updateQuestion } from '@/lib/db'
import { parseQuestionInput } from '@/lib/parseQuestionInput'
import { isAllowedOrigin, readJsonBody } from '@/lib/requestGuard'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
    }

    const { id } = await params
    const body = await readJsonBody(request)
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: body.status })
    }

    const parsed = parseQuestionInput(body.value)
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const question = await updateQuestion(id, parsed)
    if (!question) return NextResponse.json({ error: 'Question not found.' }, { status: 404 })
    return NextResponse.json({ question })
  } catch (error) {
    console.error('Failed to update question', error)
    return NextResponse.json({ error: 'Could not update the question.' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
    }

    const { id } = await params
    const result = await deleteQuestion(id)
    if (!result.ok) {
      return NextResponse.json(
        {
          error: 'This question is used in show/hide rules. Remove those conditions first.',
          referencedBy: result.referencedBy,
        },
        { status: 409 }
      )
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete question', error)
    return NextResponse.json({ error: 'Could not delete the question.' }, { status: 500 })
  }
}
