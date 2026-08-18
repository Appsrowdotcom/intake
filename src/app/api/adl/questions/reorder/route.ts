import { NextResponse } from 'next/server'
import { reorderQuestions } from '@/lib/db'
import { isAllowedOrigin, readJsonBody } from '@/lib/requestGuard'

export async function PUT(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
    }

    const body = await readJsonBody(request)
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: body.status })
    }

    const ids =
      body.value && typeof body.value === 'object' && !Array.isArray(body.value)
        ? (body.value as { ids?: unknown }).ids
        : undefined

    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      return NextResponse.json({ error: 'ids must be an array of question ids.' }, { status: 400 })
    }

    const questions = await reorderQuestions(ids)
    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Failed to reorder questions', error)
    return NextResponse.json({ error: 'Could not reorder questions.' }, { status: 500 })
  }
}
