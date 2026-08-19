import { notFound } from 'next/navigation'
import { getQuestionnaireBySlug, ensureSeeded } from '@/lib/db'
import { ClientQuestionnaire } from '@/components/ClientQuestionnaire'

export const dynamic = 'force-dynamic'

export default async function QuestionnairePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  try {
    await ensureSeeded()
    const questionnaire = await getQuestionnaireBySlug('q/' + slug)
    if (!questionnaire || questionnaire.status !== 'live') return notFound()
    return <ClientQuestionnaire questionnaire={questionnaire} />
  } catch (error) {
    console.error('Failed to load questionnaire', error)
    return notFound()
  }
}
