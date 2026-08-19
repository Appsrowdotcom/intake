import type { QuestionType, QuestionRole, QuestionData } from './questions'
import { SUPPORTED_TYPES } from './questions'

const ROLES: QuestionRole[] = ['full_name', 'email', 'company', 'relationship', 'project_type']

function clip(value: string, max: number): string {
  return value.slice(0, max)
}

export function parseQuestionInput(body: unknown): Partial<QuestionData> & { type: QuestionType; question: string } | { error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid question payload.' }
  }

  const data = body as Record<string, unknown>
  const type = data.type
  if (typeof type !== 'string' || !SUPPORTED_TYPES.includes(type as QuestionType)) {
    return { error: 'Choose a valid question type.' }
  }

  const question = typeof data.question === 'string' ? data.question.trim() : ''
  if (!question) return { error: 'Question text is required.' }
  if (question.length > 500) return { error: 'Question text is too long.' }

  let role: QuestionRole | null = null
  if (data.role) {
    if (typeof data.role !== 'string' || !ROLES.includes(data.role as QuestionRole)) {
      return { error: 'Choose a valid role.' }
    }
    role = data.role as QuestionRole
  }

  const options = Array.isArray(data.options)
    ? data.options
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 50)
        .map((item) => clip(item, 200))
    : []

  return {
    question,
    helpText: typeof data.helpText === 'string' ? clip(data.helpText.trim(), 4000) : '',
    placeholder: typeof data.placeholder === 'string' ? clip(data.placeholder.trim(), 400) : '',
    type: type as QuestionType,
    required: Boolean(data.required),
    active: data.active !== false,
    options: (type === 'single_select' || type === 'multi_select') ? options : [],
    logic: data.logic as QuestionData['logic'],
    role,
  }
}
