'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AdlLogoutButton() {
  const router = useRouter()
  const [isLeaving, setIsLeaving] = useState(false)

  async function logout() {
    setIsLeaving(true)
    await fetch('/api/adl/logout', { method: 'POST' })
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={isLeaving}
      className="rounded-full border border-line bg-white px-3.5 py-2 text-sm font-bold text-ink"
    >
      {isLeaving ? 'Leaving...' : 'Lock'}
    </button>
  )
}
