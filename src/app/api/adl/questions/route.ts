import { NextResponse } from 'next/server'
import { createQuestion, duplicateQuestion, listQuestions } from '@/lib/db'
import { parseQuestionInput } from '@/lib/parseQuestionInput'
import { isAllowedOrigin, readJsonBody } from '@/lib/requestGuard'

export async function GET() {
  try {
    const questions = await listQuestions(false)
    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Failed to list questions', error)
    return NextResponse.json({ error: 'Could not load questions.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
    }

    const body = await readJsonBody(request)
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: body.status })
    }

    const payload = body.value as Record<string, unknown> | null
    if (payload && typeof payload.duplicateFrom === 'string') {
      const copied = await duplicateQuestion(payload.duplicateFrom)
      if (!copied) return NextResponse.json({ error: 'Question not found.' }, { status: 404 })
      return NextResponse.json({ question: copied })
    }

    if (payload && payload.preset === 'yesno') {
      const question = await createQuestion({
        kicker: '',
        title: 'Untitled question',
        description: null,
        placeholder: null,
        type: 'single',
        required: false,
        options: ['Yes', 'No'],
        showRule: null,
        role: null,
        isActive: true,
      })
      return NextResponse.json({ question })
    }

    const parsed = parseQuestionInput(payload)
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const question = await createQuestion({
      ...parsed,
      title: parsed.title || 'Untitled question',
    })
    return NextResponse.json({ question })
  } catch (error) {
    console.error('Failed to create question', error)
    return NextResponse.json({ error: 'Could not create the question.' }, { status: 500 })
  }
}
