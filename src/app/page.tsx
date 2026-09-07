import { listQuestionnaires, ensureSeeded } from '@/lib/db'
import { ClientQuestionnaire } from '@/components/ClientQuestionnaire'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  try {
    await ensureSeeded()
    const questionnaires = await listQuestionnaires()
    const live = questionnaires.filter((q) => q.status === 'live')
    const defaultQ = live.find((q) => q.isDefault) || live[0]

    if (!defaultQ) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center">
          <div className="max-w-[520px]">
            <h1 className="text-2xl font-semibold tracking-tight">No live questionnaire yet</h1>
            <p className="mt-3 text-sm text-muted">
              Publish a questionnaire and mark it as the homepage form in the admin workspace.
            </p>
          </div>
        </div>
      )
    }

    return <ClientQuestionnaire questionnaire={defaultQ} />
  } catch (error) {
    console.error('Failed to load questionnaire', error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center">
        <div className="max-w-[520px]">
          <h1 className="text-2xl font-semibold tracking-tight">The questionnaire is temporarily unavailable.</h1>
          <p className="mt-3 text-sm text-muted">Please try again shortly.</p>
        </div>
      </div>
    )
  }
}
