import {
  Answers,
  Question,
  collectVisibleAnswers,
  getRoleValue,
  getString,
  getVisibleQuestions,
  isAnswered,
} from './questions'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_ANSWER_CHARS = 4000
const MAX_MULTI_OPTIONS = 40
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export type ValidationResult =
  | { ok: true; payload: Answers }
  | { ok: false; error: string }

function sanitizeAnswers(questions: Question[], raw: Record<string, unknown>): Answers | null {
  const allowed = new Set(questions.map((question) => question.id))
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

export function validateSubmission(questions: Question[], raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Answers are required.' }
  }

  const answers = sanitizeAnswers(questions, raw as Record<string, unknown>)
  if (!answers) {
    return { ok: false, error: 'Answers are invalid.' }
  }

  const visible = getVisibleQuestions(questions, answers)

  for (const question of visible) {
    if (question.required && !isAnswered(question, answers)) {
      return { ok: false, error: `Please answer: ${question.title}` }
    }
  }

  const payload = collectVisibleAnswers(questions, answers)

  const emailQuestion = visible.find((question) => question.role === 'email' || question.type === 'email')
  if (emailQuestion && isAnswered(emailQuestion, payload)) {
    const email = getString(payload, emailQuestion.id).trim()
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return { ok: false, error: 'Please provide a valid work email.' }
    }
  }

  const fullName = getRoleValue(questions, payload, 'full_name')
  const email = getRoleValue(questions, payload, 'email')
  const company = getRoleValue(questions, payload, 'company')
  if (questions.some((question) => question.role === 'full_name') && !fullName) {
    return { ok: false, error: 'Name is required.' }
  }
  if (questions.some((question) => question.role === 'email') && !email) {
    return { ok: false, error: 'Email is required.' }
  }
  if (questions.some((question) => question.role === 'company') && !company) {
    return { ok: false, error: 'Company is required.' }
  }

  return { ok: true, payload }
}
