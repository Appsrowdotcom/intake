import { NextResponse } from 'next/server'
import { insertSubmission, listQuestions } from '@/lib/db'
import { getRoleValue } from '@/lib/questions'
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rateLimit'
import { isAllowedOrigin, readJsonBody } from '@/lib/requestGuard'
import { validateSubmission } from '@/lib/validateSubmission'

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
    }

    const limited = rateLimit(`submit:${clientIp(request)}`, 8, 10 * 60 * 1000)
    if (!limited.ok) {
      return NextResponse.json(tooManyRequests(limited.retryAfterSec), {
        status: 429,
        headers: { 'Retry-After': String(limited.retryAfterSec) },
      })
    }

    const body = await readJsonBody(request)
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: body.status })
    }

    const answers =
      body.value && typeof body.value === 'object' && !Array.isArray(body.value)
        ? (body.value as { answers?: unknown }).answers
        : undefined

    const questions = await listQuestions(true)
    const result = validateSubmission(questions, answers)

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const { payload } = result
    const saved = await insertSubmission({
      fullName: getRoleValue(questions, payload, 'full_name') || '—',
      email: getRoleValue(questions, payload, 'email') || 'unknown@unknown',
      companyName: getRoleValue(questions, payload, 'company') || '—',
      relationship: getRoleValue(questions, payload, 'relationship') || null,
      projectType: getRoleValue(questions, payload, 'project_type') || null,
      answers: payload,
    })

    return NextResponse.json({ id: saved.id })
  } catch (error) {
    console.error('Failed to save submission', error)
    return NextResponse.json({ error: 'Could not save your responses.' }, { status: 500 })
  }
}
