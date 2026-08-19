import { NextResponse } from 'next/server'
import { getQuestionnaireBySlug, insertSubmission, ensureSeeded } from '@/lib/db'
import { isAllowedOrigin, readJsonBody } from '@/lib/requestGuard'
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rateLimit'
import { validateSubmission } from '@/lib/validateSubmission'
import { formatAnswer, type QuestionData } from '@/lib/questions'

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })

    const limited = rateLimit(`submit:${clientIp(request)}`, 8, 10 * 60 * 1000)
    if (!limited.ok) {
      return NextResponse.json(tooManyRequests(limited.retryAfterSec), {
        status: 429,
        headers: { 'Retry-After': String(limited.retryAfterSec) },
      })
    }

    const body = await readJsonBody(request)
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status })

    const data = body.value as Record<string, unknown>
    const slug = typeof data.slug === 'string' ? data.slug : 'appsrow'
    const answers = data.answers as Record<string, unknown> | undefined

    await ensureSeeded()
    const questionnaire = await getQuestionnaireBySlug(slug)
    if (!questionnaire) return NextResponse.json({ error: 'Questionnaire not found.' }, { status: 404 })
    if (questionnaire.status !== 'live') return NextResponse.json({ error: 'This questionnaire is not active.' }, { status: 400 })

    const allQuestions = questionnaire.sections.flatMap((s) => s.questions)
    const result = validateSubmission(allQuestions, answers)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    const { payload } = result

    function roleValue(role: string): string {
      const q = allQuestions.find((x) => x.role === role)
      return q ? formatAnswer(payload[q.id]) : ''
    }

    const saved = await insertSubmission({
      questionnaireId: questionnaire.id,
      name: roleValue('full_name') || '—',
      email: roleValue('email') || 'unknown@unknown',
      company: roleValue('company') || '—',
      projectType: roleValue('project_type') || '',
      answers: payload,
    })

    return NextResponse.json({ id: saved.id })
  } catch (error) {
    console.error('Failed to save submission', error)
    return NextResponse.json({ error: 'Could not save your responses.' }, { status: 500 })
  }
}
