import { AdlLogoutButton } from '@/components/AdlLogoutButton'
import { AdlNav } from '@/components/AdlNav'

export function AdlHeaderActions() {
  return (
    <div className="flex items-center gap-2">
      <AdlNav />
      <AdlLogoutButton />
    </div>
  )
}
