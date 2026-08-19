import type { QuestionData, Answers } from './questions'
import { getVisibleQuestions, isValueAnswered } from './questions'

const MAX_ANSWER_CHARS = 4000
const MAX_MULTI_OPTIONS = 40
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

type ValidationResult =
  | { ok: true; payload: Answers }
  | { ok: false; error: string }

function sanitizeAnswers(questions: QuestionData[], raw: Record<string, unknown>): Answers | null {
  const allowed = new Set(questions.map((q) => q.id))
  const answers: Answers = {}

  for (const [key, value] of Object.entries(raw)) {
    if (DANGEROUS_KEYS.has(key) || !allowed.has(key)) continue
    if (typeof value === 'string') {
      if (value.length > MAX_ANSWER_CHARS) return null
      answers[key] = value
      continue
    }
    if (Array.isArray(value)) {
      if (value.length > MAX_MULTI_OPTIONS) return null
      if (!value.every((item) => typeof item === 'string' && item.length <= MAX_ANSWER_CHARS)) return null
      answers[key] = value
    }
  }
  return answers
}

export function validateSubmission(questions: QuestionData[], raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Invalid submission.' }
  }

  const answers = sanitizeAnswers(questions, raw as Record<string, unknown>)
  if (!answers) return { ok: false, error: 'Answers are invalid.' }

  const visible = getVisibleQuestions(questions, answers)
  for (const q of visible) {
    if (q.required && !isValueAnswered(answers[q.id])) {
      return { ok: false, error: `"${q.question}" is required.` }
    }
  }

  return { ok: true, payload: answers }
}
