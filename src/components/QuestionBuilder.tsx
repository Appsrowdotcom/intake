'use client'

import { useMemo, useState } from 'react'
import {
  QUESTION_ROLES,
  QUESTION_TYPE_LABELS,
  SHOW_OPERATOR_LABELS,
  isChoiceType,
  type Question,
  type QuestionRole,
  type QuestionType,
  type ShowCondition,
  type ShowOperator,
  type ShowRule,
} from '@/lib/questions'

const TYPES: QuestionType[] = ['text', 'textarea', 'email', 'url', 'single', 'multi']

function referencingIds(questions: Question[], id: string): string[] {
  return questions
    .filter((question) => question.id !== id)
    .filter((question) => question.showRule?.conditions.some((condition) => condition.questionId === id))
    .map((question) => question.id)
}

function cloneQuestion(question: Question): Question {
  return {
    ...question,
    options: [...question.options],
    showRule: question.showRule
      ? {
          combinator: question.showRule.combinator,
          conditions: question.showRule.conditions.map((condition) => ({ ...condition })),
        }
      : null,
  }
}

export function QuestionBuilder({ initialQuestions }: { initialQuestions: Question[] }) {
  const [questions, setQuestions] = useState(initialQuestions)
  const [selectedId, setSelectedId] = useState(initialQuestions[0]?.id ?? '')
  const [draft, setDraft] = useState<Question | null>(
    initialQuestions[0] ? cloneQuestion(initialQuestions[0]) : null
  )
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  function selectQuestion(id: string) {
    const question = questions.find((item) => item.id === id)
    if (!question) return
    setSelectedId(id)
    setDraft(cloneQuestion(question))
    setError('')
    setStatus('')
  }

  async function readError(response: Response): Promise<string> {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    return data.error || 'Something went wrong.'
  }

  async function addQuestion(preset?: 'yesno') {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/adl/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          preset === 'yesno'
            ? { preset: 'yesno' }
            : {
                title: 'Untitled question',
                type: 'text',
                kicker: '',
                required: false,
                options: [],
                isActive: true,
              }
        ),
      })
      const data = (await response.json()) as { question?: Question; error?: string }
      if (!response.ok || !data.question) throw new Error(data.error || 'Could not add a question.')
      setQuestions((prev) => [...prev, data.question!])
      setSelectedId(data.question.id)
      setDraft(cloneQuestion(data.question))
      setStatus('Question added.')
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Could not add a question.')
    } finally {
      setBusy(false)
    }
  }

  async function duplicateSelected() {
    if (!selectedId) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/adl/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duplicateFrom: selectedId }),
      })
      const data = (await response.json()) as { question?: Question; error?: string }
      if (!response.ok || !data.question) throw new Error(data.error || 'Could not duplicate.')
      setQuestions((prev) => [...prev, data.question!])
      setSelectedId(data.question.id)
      setDraft(cloneQuestion(data.question))
      setStatus('Question duplicated.')
    } catch (dupError) {
      setError(dupError instanceof Error ? dupError.message : 'Could not duplicate.')
    } finally {
      setBusy(false)
    }
  }

  async function deleteSelected() {
    if (!selectedId) return
    const usedBy = referencingIds(questions, selectedId)
    if (usedBy.length > 0) {
      setError(`This question is used in show/hide rules on: ${usedBy.join(', ')}. Remove those conditions first.`)
      return
    }
    if (!window.confirm('Delete this question? Existing submissions keep their answers.')) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/adl/questions/${selectedId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await readError(response))
      const remaining = questions.filter((question) => question.id !== selectedId)
      setQuestions(remaining)
      const next = remaining[0] ?? null
      setSelectedId(next?.id ?? '')
      setDraft(next ? cloneQuestion(next) : null)
      setStatus('Question deleted.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete.')
    } finally {
      setBusy(false)
    }
  }

  async function moveSelected(direction: -1 | 1) {
    const index = questions.findIndex((question) => question.id === selectedId)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= questions.length) return
    const next = [...questions]
    const [item] = next.splice(index, 1)
    next.splice(nextIndex, 0, item)
    const ids = next.map((question) => question.id)
    setQuestions(next.map((question, sortIndex) => ({ ...question, sortOrder: sortIndex + 1 })))
    setBusy(true)
    try {
      const response = await fetch('/api/adl/questions/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!response.ok) throw new Error(await readError(response))
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'Could not reorder.')
    } finally {
      setBusy(false)
    }
  }

  async function saveDraft() {
    if (!draft) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/adl/questions/${draft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kicker: draft.kicker,
          title: draft.title,
          description: draft.description,
          placeholder: draft.placeholder,
          type: draft.type,
          required: draft.required,
          options: draft.options,
          showRule: draft.showRule,
          role: draft.role,
          isActive: draft.isActive,
        }),
      })
      const data = (await response.json()) as { question?: Question; error?: string }
      if (!response.ok || !data.question) throw new Error(data.error || 'Could not save.')
      setQuestions((prev) =>
        prev.map((question) => {
          if (question.id === data.question!.id) return data.question!
          if (data.question!.role && question.role === data.question!.role && question.id !== data.question!.id) {
            return { ...question, role: null }
          }
          return question
        })
      )
      setDraft(cloneQuestion(data.question))
      setStatus('Saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-[0.07em] text-primary">Builder</div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Questions</h1>
          <p className="mt-1 text-sm text-muted">
            Add, edit, reorder, and set show/hide rules. The live form on the homepage uses this list.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void addQuestion()}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-35"
          >
            Add question
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void addQuestion('yesno')}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-extrabold"
          >
            Add Yes / No
          </button>
        </div>
      </div>

      {error ? <p className="mb-4 text-sm font-semibold text-primary">{error}</p> : null}
      {status ? <p className="mb-4 text-sm text-muted">{status}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <aside className="rounded-[20px] border border-line bg-white">
          <div className="max-h-[calc(100vh-220px)] overflow-auto p-2">
            {questions.map((question, index) => (
              <button
                key={question.id}
                type="button"
                onClick={() => selectQuestion(question.id)}
                className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left ${
                  question.id === selectedId ? 'bg-[#fff7f7] ring-1 ring-primary' : 'hover:bg-[#fafafa]'
                } ${question.isActive ? '' : 'opacity-50'}`}
              >
                <div className="flex items-center justify-between gap-2 text-[10px] font-extrabold uppercase tracking-[0.06em] text-muted">
                  <span>
                    {index + 1} · {QUESTION_TYPE_LABELS[question.type]}
                  </span>
                  {question.required ? <span className="text-primary">Required</span> : null}
                </div>
                <div className="mt-1 text-sm font-bold leading-snug">{question.title || 'Untitled question'}</div>
              </button>
            ))}
          </div>
        </aside>

        {draft ? (
          <QuestionEditor
            draft={draft}
            questions={questions}
            busy={busy}
            onChange={setDraft}
            onSave={() => void saveDraft()}
            onDuplicate={() => void duplicateSelected()}
            onDelete={() => void deleteSelected()}
            onMove={(direction) => void moveSelected(direction)}
            canMoveUp={questions[0]?.id !== draft.id}
            canMoveDown={questions[questions.length - 1]?.id !== draft.id}
          />
        ) : (
          <div className="rounded-[20px] border border-line bg-white p-8 text-sm text-muted">
            Add a question to get started.
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionEditor({
  draft,
  questions,
  busy,
  onChange,
  onSave,
  onDuplicate,
  onDelete,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  draft: Question
  questions: Question[]
  busy: boolean
  onChange: (question: Question) => void
  onSave: () => void
  onDuplicate: () => void
  onDelete: () => void
  onMove: (direction: -1 | 1) => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const choice = isChoiceType(draft.type)

  function patch(partial: Partial<Question>) {
    onChange({ ...draft, ...partial })
  }

  return (
    <div className="rounded-[20px] border border-line bg-white p-5 md:p-7">
      <div className="mb-5 flex flex-wrap gap-2">
        <button type="button" disabled={busy || !canMoveUp} onClick={() => onMove(-1)} className={secondaryBtn}>
          Move up
        </button>
        <button type="button" disabled={busy || !canMoveDown} onClick={() => onMove(1)} className={secondaryBtn}>
          Move down
        </button>
        <button type="button" disabled={busy} onClick={onDuplicate} className={secondaryBtn}>
          Duplicate
        </button>
        <button type="button" disabled={busy} onClick={onDelete} className={secondaryBtn}>
          Delete
        </button>
        <button
          type="button"
          disabled={busy || !draft.title.trim()}
          onClick={onSave}
          className="ml-auto rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-white disabled:opacity-35"
        >
          {busy ? 'Saving...' : 'Save question'}
        </button>
      </div>

      <label className={labelClass}>Section label</label>
      <input className={inputClass} value={draft.kicker} onChange={(event) => patch({ kicker: event.target.value })} />

      <label className={labelClass}>Question</label>
      <input className={inputClass} value={draft.title} onChange={(event) => patch({ title: event.target.value })} />

      <label className={labelClass}>Help text</label>
      <textarea
        className={textareaClass}
        value={draft.description ?? ''}
        onChange={(event) => patch({ description: event.target.value || null })}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Type</label>
          <select
            className={selectClass}
            value={draft.type}
            onChange={(event) => {
              const type = event.target.value as QuestionType
              patch({
                type,
                options: isChoiceType(type) ? (draft.options.length ? draft.options : ['Option 1', 'Option 2']) : [],
              })
            }}
          >
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {QUESTION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Placeholder</label>
          <input
            className={inputClass}
            value={draft.placeholder ?? ''}
            onChange={(event) => patch({ placeholder: event.target.value || null })}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={draft.required}
            onChange={(event) => patch({ required: event.target.checked })}
          />
          Required
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => patch({ isActive: event.target.checked })}
          />
          Active on live form
        </label>
      </div>

      <label className={labelClass}>List-view role</label>
      <select
        className={selectClass}
        value={draft.role ?? ''}
        onChange={(event) => patch({ role: (event.target.value || null) as QuestionRole | null })}
      >
        <option value="">None</option>
        {QUESTION_ROLES.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-muted">Used on the Responses table (name, email, company, project type).</p>

      {choice ? (
        <div className="mt-6">
          <div className="text-xs font-extrabold uppercase tracking-[0.06em] text-muted">Choices</div>
          <div className="mt-2 grid gap-2">
            {draft.options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className={inputClass}
                  value={option}
                  onChange={(event) => {
                    const options = [...draft.options]
                    options[index] = event.target.value
                    patch({ options })
                  }}
                />
                <button
                  type="button"
                  className={secondaryBtn}
                  onClick={() => patch({ options: draft.options.filter((_, optionIndex) => optionIndex !== index) })}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className={secondaryBtn} onClick={() => patch({ options: [...draft.options, ''] })}>
              Add choice
            </button>
          </div>
        </div>
      ) : null}

      <ShowRuleEditor draft={draft} questions={questions} onChange={patch} />
    </div>
  )
}

function ShowRuleEditor({
  draft,
  questions,
  onChange,
}: {
  draft: Question
  questions: Question[]
  onChange: (partial: Partial<Question>) => void
}) {
  const enabled = Boolean(draft.showRule && draft.showRule.conditions.length > 0)
  const others = questions.filter((question) => question.id !== draft.id)

  function setRule(showRule: ShowRule | null) {
    onChange({ showRule })
  }

  function updateCondition(index: number, partial: Partial<ShowCondition>) {
    if (!draft.showRule) return
    const conditions = draft.showRule.conditions.map((condition, conditionIndex) =>
      conditionIndex === index ? { ...condition, ...partial } : condition
    )
    setRule({ ...draft.showRule, conditions })
  }

  return (
    <div className="mt-8 border-t border-line pt-6">
      <div className="text-xs font-extrabold uppercase tracking-[0.06em] text-muted">Show when</div>
      <div className="mt-3 flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="radio" checked={!enabled} onChange={() => setRule(null)} />
          Always
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="radio"
            checked={enabled}
            onChange={() =>
              setRule({
                combinator: 'and',
                conditions: [{ questionId: others[0]?.id ?? '', operator: 'eq', value: '' }],
              })
            }
          />
          When conditions match
        </label>
      </div>

      {enabled && draft.showRule ? (
        <div className="mt-4">
          <select
            className={selectClass}
            value={draft.showRule.combinator}
            onChange={(event) =>
              setRule({ ...draft.showRule!, combinator: event.target.value as ShowRule['combinator'] })
            }
          >
            <option value="and">Match all conditions</option>
            <option value="or">Match any condition</option>
          </select>

          <div className="mt-3 grid gap-3">
            {draft.showRule.conditions.map((condition, index) => (
              <ConditionRow
                key={`${condition.questionId}-${index}`}
                condition={condition}
                questions={others}
                onChange={(partial) => updateCondition(index, partial)}
                onRemove={() => {
                  const conditions = draft.showRule!.conditions.filter((_, conditionIndex) => conditionIndex !== index)
                  setRule(conditions.length ? { ...draft.showRule!, conditions } : null)
                }}
              />
            ))}
          </div>
          <button
            type="button"
            className={`${secondaryBtn} mt-3`}
            onClick={() =>
              setRule({
                ...draft.showRule!,
                conditions: [
                  ...draft.showRule!.conditions,
                  { questionId: others[0]?.id ?? '', operator: 'eq', value: '' },
                ],
              })
            }
          >
            Add condition
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ConditionRow({
  condition,
  questions,
  onChange,
  onRemove,
}: {
  condition: ShowCondition
  questions: Question[]
  onChange: (partial: Partial<ShowCondition>) => void
  onRemove: () => void
}) {
  const source = questions.find((question) => question.id === condition.questionId)
  const operators = useMemo((): ShowOperator[] => {
    if (source?.type === 'multi') return ['contains', 'answered']
    if (source?.type === 'single') return ['eq', 'neq', 'in', 'answered']
    return ['eq', 'neq', 'answered']
  }, [source?.type])

  const valueOptions = source?.options ?? []

  return (
    <div className="grid gap-2 rounded-xl border border-line p-3 md:grid-cols-[1fr_140px_1fr_auto]">
      <select
        className={selectClass}
        value={condition.questionId}
        onChange={(event) => onChange({ questionId: event.target.value, value: '' })}
      >
        <option value="">Select a question</option>
        {questions.map((question) => (
          <option key={question.id} value={question.id}>
            {question.title || question.id}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={operators.includes(condition.operator) ? condition.operator : operators[0]}
        onChange={(event) => onChange({ operator: event.target.value as ShowOperator, value: '' })}
      >
        {operators.map((operator) => (
          <option key={operator} value={operator}>
            {SHOW_OPERATOR_LABELS[operator]}
          </option>
        ))}
      </select>
      {condition.operator === 'answered' ? (
        <span className="self-center text-sm text-muted">No value needed</span>
      ) : condition.operator === 'in' ? (
        <div className="flex flex-wrap gap-2">
          {valueOptions.map((option) => {
            const selected = Array.isArray(condition.value) && condition.value.includes(option)
            return (
              <label key={option} className="flex items-center gap-1 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    const current = Array.isArray(condition.value) ? [...condition.value] : []
                    const next = selected ? current.filter((item) => item !== option) : [...current, option]
                    onChange({ value: next })
                  }}
                />
                {option}
              </label>
            )
          })}
        </div>
      ) : valueOptions.length > 0 ? (
        <select
          className={selectClass}
          value={typeof condition.value === 'string' ? condition.value : ''}
          onChange={(event) => onChange({ value: event.target.value })}
        >
          <option value="">Select value</option>
          {valueOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={inputClass}
          value={typeof condition.value === 'string' ? condition.value : ''}
          onChange={(event) => onChange({ value: event.target.value })}
        />
      )}
      <button type="button" className={secondaryBtn} onClick={onRemove}>
        Remove
      </button>
    </div>
  )
}

const labelClass = 'mt-4 mb-1 block text-xs font-extrabold uppercase tracking-[0.06em] text-muted'
const inputClass =
  'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-primary'
const textareaClass = `${inputClass} min-h-[88px]`
const selectClass = inputClass
const secondaryBtn =
  'rounded-xl border border-line bg-white px-3 py-2 text-sm font-extrabold disabled:opacity-35'
