'use client'

import { KeyboardEvent, useMemo, useState } from 'react'
import { BrandHeader } from '@/components/BrandHeader'
import {
  Answers,
  Question,
  formatAnswer,
  getVisibleQuestions,
  isAnswered,
} from '@/lib/questions'

export function Questionnaire({ questions }: { questions: Question[] }) {
  const [answers, setAnswers] = useState<Answers>({})
  const [cursor, setCursor] = useState(0)
  const [complete, setComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const visible = useMemo(() => getVisibleQuestions(questions, answers), [answers, questions])
  const safeCursor = Math.min(cursor, Math.max(visible.length - 1, 0))
  const current = visible[safeCursor]
  const progress = visible.length ? Math.round((safeCursor / visible.length) * 100) : 0
  const isLast = safeCursor === visible.length - 1
  const canContinue = current ? !current.required || isAnswered(current, answers) : false
  const answeredQuestions = visible.filter((question) => isAnswered(question, answers))

  function setAnswer(id: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [id]: value }))
    setErrorMessage('')
  }

  function toggleMulti(id: string, option: string) {
    const currentValue = answers[id]
    const list = Array.isArray(currentValue) ? [...currentValue] : []
    const index = list.indexOf(option)
    if (index >= 0) list.splice(index, 1)
    else list.push(option)
    setAnswer(id, list)
  }

  async function goNext() {
    if (!current || !canContinue || isSubmitting) return

    if (!isLast) {
      setCursor(safeCursor + 1)
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Could not save your responses.')
      }
      setComplete(true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save your responses.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function goBack() {
    if (safeCursor > 0) setCursor(safeCursor - 1)
  }

  function restart() {
    setAnswers({})
    setCursor(0)
    setComplete(false)
    setErrorMessage('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, question: Question) {
    if (event.key !== 'Enter') return
    if (question.type === 'textarea' && !event.metaKey && !event.ctrlKey) return
    event.preventDefault()
    void goNext()
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <BrandHeader />
      <main className="mx-auto w-[min(1220px,calc(100%-32px))] py-10 pb-24">
        <div className="mx-auto overflow-hidden rounded-[30px] border border-line bg-white shadow-[0_18px_55px_rgba(2,2,2,0.08)]">
          <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
            <strong className="text-sm font-extrabold">Tell us about your project</strong>
            <div className="flex max-w-[310px] flex-1 items-center gap-3">
              <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-[#ececec]" aria-label="Progress">
                <div
                  className="h-full bg-primary transition-[width] duration-300"
                  style={{ width: `${complete ? 100 : progress}%` }}
                />
              </div>
              <span className="text-xs text-muted">{complete ? '100%' : `${progress}%`}</span>
            </div>
          </div>

          <div className="flex min-h-[530px] flex-col justify-start px-6 py-10 md:justify-center md:px-12 md:py-14">
            {complete ? (
              <Summary answers={answers} questions={answeredQuestions} onRestart={restart} />
            ) : current ? (
              <QuestionStep
                question={current}
                answers={answers}
                onSingle={(option) => setAnswer(current.id, option)}
                onMulti={(option) => toggleMulti(current.id, option)}
                onText={(value) => setAnswer(current.id, value)}
                onKeyDown={handleKeyDown}
              />
            ) : null}

            {errorMessage ? (
              <p className="mt-6 text-sm font-semibold text-primary">{errorMessage}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line bg-[#fcfcfc] px-4 py-4 md:px-6">
            <button
              type="button"
              onClick={goBack}
              disabled={complete || safeCursor === 0}
              className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-extrabold text-ink disabled:cursor-not-allowed disabled:opacity-35"
            >
              Back
            </button>
            <span className="text-xs text-muted">
              {complete
                ? 'Complete'
                : `Question ${Math.min(safeCursor + 1, visible.length)} of ${visible.length}`}
            </span>
            {complete ? (
              <span className="w-[88px]" />
            ) : (
              <button
                type="button"
                onClick={() => void goNext()}
                disabled={!canContinue || isSubmitting}
                className="rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(193,32,41,0.2)] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
              >
                {isSubmitting ? 'Submitting...' : isLast ? 'Finish' : 'Continue'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function QuestionStep({
  question,
  answers,
  onSingle,
  onMulti,
  onText,
  onKeyDown,
}: {
  question: Question
  answers: Answers
  onSingle: (option: string) => void
  onMulti: (option: string) => void
  onText: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, question: Question) => void
}) {
  const current = answers[question.id]
  const textValue = typeof current === 'string' ? current : ''

  return (
    <div key={question.id} className="animate-fade-in-up">
      <div className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.07em] text-primary">
        {question.kicker}
      </div>
      <h1 className="max-w-[820px] text-[clamp(28px,4vw,46px)] font-extrabold leading-[1.08] tracking-[-0.045em]">
        {question.title}
      </h1>
      {question.description ? (
        <p className="mt-3 max-w-[680px] text-[15px] text-muted">{question.description}</p>
      ) : null}

      <div className="mt-8 grid max-w-[780px] gap-2.5">
        {question.type === 'single' || question.type === 'multi' ? (
          (question.options ?? []).map((option) => {
            const selected =
              question.type === 'multi'
                ? Array.isArray(current) && current.includes(option)
                : current === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => (question.type === 'multi' ? onMulti(option) : onSingle(option))}
                className={`flex w-full items-center justify-between gap-4 rounded-[15px] border px-4 py-3.5 text-left font-bold transition duration-150 ${
                  selected
                    ? 'border-primary bg-[#fff7f7] shadow-[inset_0_0_0_1px_#C12029]'
                    : 'border-line bg-white hover:-translate-y-px hover:border-[#bdbdbd] hover:shadow-[0_7px_18px_rgba(0,0,0,0.05)]'
                }`}
              >
                <span>{option}</span>
                <span
                  className={`relative h-[18px] w-[18px] shrink-0 border-[1.5px] ${
                    question.type === 'multi' ? 'rounded-[5px]' : 'rounded-full'
                  } ${selected ? 'border-primary' : 'border-[#bdbdbd]'}`}
                >
                  {selected ? (
                    <span
                      className={`absolute bg-primary ${
                        question.type === 'multi' ? 'inset-[3px] rounded-[2px]' : 'inset-1 rounded-full'
                      }`}
                    />
                  ) : null}
                </span>
              </button>
            )
          })
        ) : question.type === 'textarea' ? (
          <textarea
            autoFocus
            className="min-h-[120px] resize-y rounded-[15px] border border-line px-3.5 py-3.5 text-base outline-none transition focus:border-primary focus:shadow-[0_0_0_3px_rgba(193,32,41,0.08)]"
            placeholder={question.placeholder ?? undefined}
            value={textValue}
            onChange={(event) => onText(event.target.value)}
            onKeyDown={(event) => onKeyDown(event, question)}
          />
        ) : (
          <input
            autoFocus
            type={question.type === 'email' ? 'email' : question.type === 'url' ? 'url' : 'text'}
            className="w-full border-0 border-b-2 border-[#cfcfcf] bg-transparent py-3.5 text-[21px] outline-none transition focus:border-primary"
            placeholder={question.placeholder ?? undefined}
            value={textValue}
            onChange={(event) => onText(event.target.value)}
            onKeyDown={(event) => onKeyDown(event, question)}
          />
        )}
      </div>
    </div>
  )
}

function Summary({
  answers,
  questions,
  onRestart,
}: {
  answers: Answers
  questions: Question[]
  onRestart: () => void
}) {
  function handleCopy() {
    const text = questions
      .map((question) => `${question.id} ${question.title}\n${formatAnswer(answers[question.id])}`)
      .join('\n\n')
    void navigator.clipboard.writeText(text)
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.07em] text-primary">
        Ready for review
      </div>
      <h2 className="text-[32px] font-extrabold tracking-[-0.04em]">Thank you. We have your snapshot.</h2>
      <p className="mb-6 mt-2 max-w-[680px] text-muted">
        Appsrow will use this to prepare discovery, scoping, and a proposal. You can start another
        response if you are filling this in for a second project.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {questions.map((question) => (
          <div key={question.id} className="rounded-[14px] border border-line bg-white p-3.5">
            <small className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.06em] text-muted">
              {question.id} · {question.kicker}
            </small>
            <strong className="block break-words text-sm font-bold">
              {formatAnswer(answers[question.id])}
            </strong>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-white"
        >
          Start another response
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-extrabold"
        >
          Copy summary
        </button>
      </div>
    </div>
  )
}
