import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BrandHeader } from '@/components/BrandHeader'
import { AdlHeaderActions } from '@/components/AdlHeaderActions'
import { getSubmission, listQuestions } from '@/lib/db'
import { isAdlAuthenticated } from '@/lib/adlSession'
import { formatAnswer, questionsById, type Answers } from '@/lib/questions'

export const dynamic = 'force-dynamic'

function asAnswers(value: unknown): Answers {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Answers
    } catch {
      return {}
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Answers
  }
  return {}
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default async function AdlSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const authenticated = await isAdlAuthenticated()
  if (!authenticated) {
    redirect('/adl')
  }

  const { id } = await params
  const [submission, questions] = await Promise.all([getSubmission(id), listQuestions(false)])
  if (!submission) notFound()

  const answers = asAnswers(submission.answers)
  const byId = questionsById(questions)
  const knownIds = questions.map((question) => question.id)
  const entries = [
    ...knownIds.filter((questionId) => questionId in answers).map((questionId) => [questionId, answers[questionId]] as const),
    ...Object.entries(answers).filter(([questionId]) => !(questionId in byId)),
  ]

  return (
    <div className="min-h-screen bg-paper text-ink">
      <BrandHeader right={<AdlHeaderActions />} />
      <main className="mx-auto w-[min(1220px,calc(100%-32px))] py-10 pb-20">
        <Link href="/adl" className="text-sm font-bold text-muted hover:text-ink">
          ← All submissions
        </Link>
        <div className="mt-4 mb-8">
          <div className="text-xs font-extrabold uppercase tracking-[0.07em] text-primary">Submission</div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">{submission.full_name}</h1>
          <p className="mt-2 text-sm text-muted">
            {submission.email} · {submission.company_name} · {formatDate(submission.created_at)}
          </p>
          {submission.project_type ? (
            <p className="mt-1 text-sm font-semibold">{submission.project_type}</p>
          ) : null}
        </div>

        <div className="grid gap-3">
          {entries.map(([questionId, value]) => {
            const question = byId[questionId]
            return (
              <div key={questionId} className="rounded-[16px] border border-line bg-white p-4">
                <small className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.06em] text-muted">
                  {questionId}
                  {question ? ` · ${question.kicker}` : ''}
                </small>
                <div className="mb-2 font-extrabold tracking-tight">
                  {question?.title ?? questionId}
                </div>
                <div className="whitespace-pre-wrap break-words text-sm text-ink/90">
                  {formatAnswer(value)}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
