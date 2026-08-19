'use client'

import { useMemo, useState } from 'react'
import { AppsrowLogo } from '@/components/AppsrowLogo'
import {
  type QuestionnaireData,
  type Answers,
  getVisibleQuestions,
  isValueAnswered,
} from '@/lib/questions'

export function ClientQuestionnaire({ questionnaire }: { questionnaire: QuestionnaireData }) {
  const allQuestions = useMemo(
    () => questionnaire.sections.flatMap((s) => s.questions),
    [questionnaire]
  )
  const [answers, setAnswers] = useState<Answers>({})
  const [cursor, setCursor] = useState(0)
  const [complete, setComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const visible = useMemo(() => getVisibleQuestions(allQuestions, answers), [answers, allQuestions])
  const safeCursor = Math.min(cursor, Math.max(visible.length - 1, 0))
  const current = visible[safeCursor]
  const isLast = safeCursor === visible.length - 1
  const isFirst = safeCursor === 0
  const canContinue = current ? !current.required || isValueAnswered(answers[current.id]) : false
  const { theme } = questionnaire
  const isDark = theme.preset === 'dark'
  const isEditorial = theme.preset === 'editorial'

  function setAnswer(id: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [id]: value }))
    setErrorMessage('')
  }

  function toggleMulti(id: string, option: string) {
    const list = Array.isArray(answers[id]) ? [...(answers[id] as string[])] : []
    const idx = list.indexOf(option)
    if (idx >= 0) list.splice(idx, 1); else list.push(option)
    setAnswer(id, list)
  }

  function goBack() {
    if (safeCursor > 0) setCursor(safeCursor - 1)
  }

  async function goNext() {
    if (!current || !canContinue || isSubmitting) return
    if (!isLast) { setCursor(safeCursor + 1); return }

    setIsSubmitting(true)
    setErrorMessage('')
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: questionnaire.slug, answers }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Could not save your responses.')
      setComplete(true)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not save your responses.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const bgClass = isDark ? 'bg-ink text-white' : isEditorial ? 'bg-surface-muted' : 'bg-white'
  const mutedClass = isDark ? 'text-[#B9B9B5]' : 'text-muted'
  const optionBorder = isDark ? 'border-[#343431]' : 'border-line'

  const progressLabel = theme.progress === 'minimal'
    ? `Question ${safeCursor + 1}`
    : `${String(safeCursor + 1).padStart(2, '0')} / ${String(visible.length).padStart(2, '0')}`

  return (
    <div className={`flex min-h-screen flex-col overflow-auto p-6 md:p-12 ${bgClass} ${isEditorial ? 'border-l-0 md:border-l-[96px] md:border-[#E1E1DE]' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        {theme.showLogo && (
          <div className={isDark ? 'text-white' : 'text-ink'}>
            <AppsrowLogo className="h-auto w-[126px]" />
          </div>
        )}
        <div className={`mono text-[11px] font-semibold ${isDark ? 'text-[#A8A8A4]' : 'text-muted'}`}>
          {complete ? 'Complete' : progressLabel}
        </div>
      </div>

      <div className={`my-auto py-8 ${theme.width === 'focused' ? 'w-full md:max-w-[540px]' : ''}`}>
        {complete ? (
          <div className="animate-fade-in-up">
            <h2 className={`font-semibold tracking-tight ${theme.heading === 'compact' ? 'text-[28px]' : 'text-[32px] md:text-[44px]'}`}>
              Thank you. We have your snapshot.
            </h2>
            <p className={`mt-3 max-w-[620px] text-sm ${mutedClass}`}>
              Appsrow will use this to prepare discovery, scoping, and a proposal.
            </p>
            <button
              className="btn btn-red mt-6"
              onClick={() => { setAnswers({}); setCursor(0); setComplete(false); setErrorMessage('') }}
            >
              Start another response
            </button>
          </div>
        ) : current ? (
          <div key={current.id} className="animate-fade-in-up">
            <h2 className={`max-w-[640px] font-semibold leading-[1.04] tracking-[-0.04em] ${theme.heading === 'compact' ? 'text-3xl md:text-4xl' : 'text-[32px] md:text-[44px]'}`}>
              {current.question}
            </h2>
            {current.helpText && <p className={`mt-4 max-w-[620px] text-sm ${mutedClass}`}>{current.helpText}</p>}

            <div className="mt-8">
              {(current.type === 'single_select' || current.type === 'multi_select') ? (
                <div className={`grid border-t ${optionBorder}`}>
                  {(current.options || []).map((opt) => {
                    const selected = current.type === 'multi_select'
                      ? Array.isArray(answers[current.id]) && (answers[current.id] as string[]).includes(opt)
                      : answers[current.id] === opt
                    return (
                      <button
                        key={opt}
                        onClick={() => current.type === 'multi_select' ? toggleMulti(current.id, opt) : setAnswer(current.id, opt)}
                        className={`flex items-center justify-between gap-4 border-b ${optionBorder} bg-transparent px-1 py-4 text-left text-inherit hover:px-2 hover:text-red`}
                      >
                        <span className={selected ? 'font-semibold text-red' : ''}>{opt}</span>
                        <span>→</span>
                      </button>
                    )
                  })}
                </div>
              ) : current.type === 'long_text' ? (
                <textarea
                  autoFocus
                  className={`w-full resize-y border ${optionBorder} bg-transparent p-4 text-sm outline-none`}
                  style={{ minHeight: 120 }}
                  placeholder={current.placeholder || 'Your answer...'}
                  value={typeof answers[current.id] === 'string' ? answers[current.id] as string : ''}
                  onChange={(e) => setAnswer(current.id, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void goNext() } }}
                />
              ) : (
                <input
                  autoFocus
                  type={current.type === 'email' ? 'email' : current.type === 'url' ? 'url' : current.type === 'number' ? 'number' : current.type === 'date' ? 'date' : 'text'}
                  className={`w-full border-0 border-b-2 ${isDark ? 'border-[#343431]' : 'border-[#cfcfcf]'} bg-transparent py-3 text-xl outline-none focus:border-red`}
                  placeholder={current.placeholder || 'Your answer...'}
                  value={typeof answers[current.id] === 'string' ? answers[current.id] as string : ''}
                  onChange={(e) => setAnswer(current.id, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void goNext() } }}
                />
              )}
            </div>
            {errorMessage && <p className="mt-4 text-sm font-semibold text-red">{errorMessage}</p>}
          </div>
        ) : null}
      </div>

      {!complete && (
        <div className="flex items-center justify-between">
          <button
            className="btn btn-ghost"
            disabled={isFirst}
            onClick={goBack}
            style={{ visibility: isFirst ? 'hidden' : 'visible' }}
          >
            ← Back
          </button>
          <button
            className="btn btn-red"
            disabled={!canContinue || isSubmitting}
            onClick={() => void goNext()}
          >
            {isSubmitting ? 'Submitting...' : isLast ? 'Submit' : 'Continue'}
          </button>
        </div>
      )}
    </div>
  )
}
