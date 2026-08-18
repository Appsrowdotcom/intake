import { BrandHeader } from '@/components/BrandHeader'
import { AdlHeaderActions } from '@/components/AdlHeaderActions'
import { AdlLoginForm } from '@/components/AdlLoginForm'
import { AdlSubmissionList } from '@/components/AdlSubmissionList'
import { listSubmissions } from '@/lib/db'
import { isAdlAuthenticated } from '@/lib/adlSession'

export const dynamic = 'force-dynamic'

export default async function AdlPage() {
  const authenticated = await isAdlAuthenticated()

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <BrandHeader />
        <main className="mx-auto w-[min(1220px,calc(100%-32px))] py-16">
          <AdlLoginForm />
        </main>
      </div>
    )
  }

  const submissions = await listSubmissions()

  return (
    <div className="min-h-screen bg-paper text-ink">
      <BrandHeader right={<AdlHeaderActions />} />
      <main className="mx-auto w-[min(1220px,calc(100%-32px))] py-10 pb-20">
        <AdlSubmissionList submissions={submissions} />
      </main>
    </div>
  )
}
