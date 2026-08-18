'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { SubmissionListItem } from '@/lib/db'

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function AdlSubmissionList({ submissions }: { submissions: SubmissionListItem[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return submissions
    return submissions.filter((row) =>
      [row.full_name, row.email, row.company_name, row.project_type ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle)
    )
  }, [query, submissions])

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-[0.07em] text-primary">Responses</div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Questionnaire submissions</h1>
          <p className="mt-1 text-sm text-muted">{submissions.length} total</p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, company"
          className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-primary sm:max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[20px] border border-line bg-white p-8 text-sm text-muted">
          {submissions.length === 0
            ? 'No submissions yet.'
            : 'No submissions match that search.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-line bg-white">
          <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.1fr)_140px] gap-3 border-b border-line bg-[#fbfbfb] px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.06em] text-muted md:grid">
            <span>Name</span>
            <span>Email</span>
            <span>Company</span>
            <span>Project type</span>
            <span>Submitted</span>
          </div>
          {filtered.map((row) => (
            <Link
              key={row.id}
              href={`/adl/${row.id}`}
              className="grid gap-1 border-b border-[#ededed] px-4 py-3.5 last:border-b-0 hover:bg-[#fff7f7] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.1fr)_140px] md:items-center md:gap-3"
            >
              <strong className="text-sm font-bold">{row.full_name}</strong>
              <span className="truncate text-sm text-ink/80">{row.email}</span>
              <span className="text-sm">{row.company_name}</span>
              <span className="text-sm text-muted">{row.project_type || '—'}</span>
              <span className="text-xs text-muted">{formatDate(row.created_at)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
