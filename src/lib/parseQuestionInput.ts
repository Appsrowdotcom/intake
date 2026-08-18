import {
  parseShowRule,
  type QuestionRole,
  type QuestionType,
} from './questions'
import type { QuestionInput } from './db'

const TYPES: QuestionType[] = ['text', 'textarea', 'email', 'url', 'single', 'multi']
const ROLES: QuestionRole[] = ['full_name', 'email', 'company', 'relationship', 'project_type']

function clip(value: string, max: number): string {
  return value.slice(0, max)
}

export function parseQuestionInput(body: unknown): QuestionInput | { error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid question payload.' }
  }

  const data = body as Record<string, unknown>
  const type = data.type
  if (typeof type !== 'string' || !TYPES.includes(type as QuestionType)) {
    return { error: 'Choose a valid question type.' }
  }

  const title = typeof data.title === 'string' ? data.title.trim() : ''
  if (!title) return { error: 'Title is required.' }
  if (title.length > 500) return { error: 'Title is too long.' }

  let role: QuestionRole | null = null
  if (data.role) {
    if (typeof data.role !== 'string' || !ROLES.includes(data.role as QuestionRole)) {
      return { error: 'Choose a valid list-view role.' }
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

  const showRule = parseShowRule(data.showRule)
  if (showRule && showRule.conditions.length > 12) {
    return { error: 'Too many show/hide conditions.' }
  }

  return {
    kicker: typeof data.kicker === 'string' ? clip(data.kicker.trim(), 80) : '',
    title,
    description:
      typeof data.description === 'string' && data.description.trim()
        ? clip(data.description.trim(), 4000)
        : null,
    placeholder:
      typeof data.placeholder === 'string' && data.placeholder.trim()
        ? clip(data.placeholder.trim(), 400)
        : null,
    type: type as QuestionType,
    required: Boolean(data.required),
    options: type === 'single' || type === 'multi' ? options : [],
    showRule,
    role,
    isActive: data.isActive !== false,
  }
}
