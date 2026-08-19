import { NextResponse } from 'next/server'
import { listQuestionnaires, createQuestionnaire, ensureSeeded } from '@/lib/db'
import { isAllowedOrigin, readJsonBody } from '@/lib/requestGuard'
import type { SectionData } from '@/lib/questions'
import { uid, isValidSlug } from '@/lib/questions'

export async function GET() {
  try {
    await ensureSeeded()
    const questionnaires = await listQuestionnaires()
    return NextResponse.json({ questionnaires })
  } catch (error) {
    console.error('Failed to list questionnaires', error)
    return NextResponse.json({ error: 'Could not load questionnaires.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
    }

    const body = await readJsonBody(request)
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status })

    const data = body.value as Record<string, unknown>
    const name = typeof data.name === 'string' ? data.name.trim() : ''
    const slug = typeof data.slug === 'string' ? data.slug.trim() : ''
    const purpose = typeof data.purpose === 'string' ? data.purpose.trim() : ''

    if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    if (!isValidSlug(slug)) return NextResponse.json({ error: 'Use a valid slug.' }, { status: 400 })

    const existing = await listQuestionnaires()
    if (existing.some((q) => q.slug === slug || q.slug === 'q/' + slug)) {
      return NextResponse.json({ error: 'That slug is already in use.' }, { status: 400 })
    }

    let sections: SectionData[] = []
    const mode = data.mode === 'blank' ? 'blank' : 'universal'

    if (mode === 'universal') {
      const universal = existing.find((q) => q.isDefault)
      if (universal) {
        const idMap: Record<string, string> = {}
        sections = universal.sections.map((s, si) => {
          const newSid = uid('section')
          return {
            ...s,
            id: newSid,
            order: si + 1,
            questions: s.questions.map((q, qi) => {
              const newQid = uid('q')
              idMap[q.id] = newQid
              return { ...q, id: newQid, sectionId: newSid, order: qi + 1 }
            }),
          }
        })
        for (const s of sections) {
          for (const q of s.questions) {
            if (q.logic?.showWhen?.conditions) {
              q.logic.showWhen.conditions = q.logic.showWhen.conditions.map((c) => ({
                ...c,
                questionId: idMap[c.questionId] || c.questionId,
              }))
            }
          }
        }
      }
    }

    if (sections.length === 0 && mode === 'blank') {
      sections = [{ id: uid('section'), title: 'First section', order: 1, questions: [] }]
    }

    const questionnaire = await createQuestionnaire({
      name,
      slug: 'q/' + slug,
      purpose: purpose || 'Imported questionnaire.',
      status: 'draft',
      theme: data.theme as Record<string, unknown> | undefined,
      sections,
    })

    return NextResponse.json({ questionnaire })
  } catch (error) {
    console.error('Failed to create questionnaire', error)
    return NextResponse.json({ error: 'Could not create questionnaire.' }, { status: 500 })
  }
}
