import { AdlLoginForm } from '@/components/AdlLoginForm'
import { AdminWorkspace } from '@/components/AdminWorkspace'
import { listQuestionnaires, listResponses, getWorkspace, ensureSeeded } from '@/lib/db'
import { isAdlAuthenticated } from '@/lib/adlSession'

export const dynamic = 'force-dynamic'

export default async function AdlPage() {
  const authenticated = await isAdlAuthenticated()

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <AdlLoginForm />
      </div>
    )
  }

  await ensureSeeded()
  const [questionnaires, responses, workspace] = await Promise.all([
    listQuestionnaires(),
    listResponses(),
    getWorkspace(),
  ])

  return (
    <AdminWorkspace
      initialQuestionnaires={questionnaires}
      initialResponses={responses}
      initialWorkspace={workspace}
    />
  )
}
