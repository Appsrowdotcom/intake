'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export function AdlLoginForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/adl/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Incorrect password.')
      }
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Incorrect password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md rounded-[30px] border border-line bg-white p-8 shadow-[0_18px_55px_rgba(2,2,2,0.08)]">
      <div className="mb-2 text-xs font-extrabold uppercase tracking-[0.07em] text-primary">Responses</div>
      <h1 className="text-3xl font-extrabold tracking-tight">Enter the shared password</h1>
      <p className="mt-2 mb-6 text-sm text-muted">
        This page is for Appsrow to review questionnaire submissions. It is not a user login.
      </p>
      <input
        type="password"
        autoFocus
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password"
        className="w-full border-0 border-b-2 border-[#cfcfcf] bg-transparent py-3 text-xl outline-none transition focus:border-primary"
      />
      {error ? <p className="mt-3 text-sm font-semibold text-primary">{error}</p> : null}
      <button
        type="submit"
        disabled={!password.trim() || isSubmitting}
        className="mt-8 w-full rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-35"
      >
        {isSubmitting ? 'Checking...' : 'Continue'}
      </button>
    </form>
  )
}
