import { Questionnaire } from '@/components/Questionnaire'
import { listQuestions } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  try {
    const questions = await listQuestions(true)

    if (questions.length === 0) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-center text-muted">
          This questionnaire has no active questions yet.
        </div>
      )
    }

    return <Questionnaire questions={questions} />
  } catch (error) {
    console.error('Failed to load questions', error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-center text-muted">
        The questionnaire is temporarily unavailable.
      </div>
    )
  }
}
