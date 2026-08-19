import { redirect } from 'next/navigation'
import { listQuestionnaires, ensureSeeded } from '@/lib/db'
import { ClientQuestionnaire } from '@/components/ClientQuestionnaire'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  try {
    await ensureSeeded()
    const questionnaires = await listQuestionnaires()
    const defaultQ = questionnaires.find((q) => q.isDefault && q.status === 'live')

    if (!defaultQ) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center text-muted">
          The questionnaire is temporarily unavailable.
        </div>
      )
    }

    return <ClientQuestionnaire questionnaire={defaultQ} />
  } catch (error) {
    console.error('Failed to load questionnaire', error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center text-muted">
        The questionnaire is temporarily unavailable.
      </div>
    )
  }
}
