import {
  type Answers,
  type QuestionData,
  type QuestionRole,
  formatAnswer,
  getVisibleQuestions,
  isValueAnswered,
} from './questions'

const PLACEHOLDER_VALUES = new Set(['', '—', '-', 'unknown@unknown'])

const FIELD_PATTERNS: Record<QuestionRole, RegExp> = {
  full_name: /\b((your\s+)?full\s+name|(your\s+)?name|contact\s+name|first\s+name)\b/i,
  email: /\b(e-?mail|work\s+email)\b/i,
  company: /\b(company|organisation|organization|business(\s+name)?)\b/i,
  project_type: /\b(looking for help|project type|what do you need|primary)\b/i,
  relationship: /\brelationship\b/i,
}

export function isPlaceholderValue(value: string | undefined | null): boolean {
  return !value || PLACEHOLDER_VALUES.has(value.trim())
}

export function parseStoredAnswers(raw: unknown): Answers {
  if (!raw || typeof raw !== 'object') return {}
  const entries = Array.isArray(raw)
    ? (raw as unknown[]).map((item) => {
        if (Array.isArray(item) && item.length >= 2) return [String(item[0]), item[1]] as const
        return null
      }).filter((item): item is readonly [string, unknown] => item !== null)
    : Object.entries(raw as Record<string, unknown>)

  const answers: Answers = {}
  for (const [key, value] of entries) {
    if (typeof value === 'string') answers[key] = value
    else if (Array.isArray(value) && value.every((item) => typeof item === 'string')) answers[key] = value
    else if (value != null) answers[key] = String(value)
  }
  return answers
}

export function formatAnswerValue(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(', ')
  return String(value).trim()
}

function answerForQuestion(question: QuestionData | undefined, answers: Answers): string {
  if (!question) return ''
  return formatAnswer(answers[question.id]).trim()
}

function findByRole(questions: QuestionData[], answers: Answers, role: QuestionRole): string {
  return answerForQuestion(questions.find((q) => q.role === role), answers)
}

function findByPattern(questions: QuestionData[], answers: Answers, role: QuestionRole): string {
  return answerForQuestion(questions.find((q) => FIELD_PATTERNS[role].test(q.question)), answers)
}

function findEmailInAnswers(answers: Answers): string {
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  for (const value of Object.values(answers)) {
    const text = formatAnswer(value).trim()
    if (emailRe.test(text)) return text
  }
  return ''
}

export function extractContact(questions: QuestionData[], answers: Answers) {
  const email =
    findByRole(questions, answers, 'email') ||
    answerForQuestion(questions.find((q) => q.type === 'email'), answers) ||
    findByPattern(questions, answers, 'email') ||
    findEmailInAnswers(answers)

  const name =
    findByRole(questions, answers, 'full_name') ||
    findByPattern(questions, answers, 'full_name')

  const company =
    findByRole(questions, answers, 'company') ||
    findByPattern(questions, answers, 'company')

  const projectType =
    findByRole(questions, answers, 'project_type') ||
    findByPattern(questions, answers, 'project_type')

  return {
    name: name || '',
    email: email || '',
    company: company || '',
    projectType: projectType || '',
  }
}

export function responseTitle(input: {
  name?: string
  email?: string
  company?: string
  projectType?: string
}): string {
  if (!isPlaceholderValue(input.name)) return input.name!.trim()
  if (!isPlaceholderValue(input.email) && input.email !== 'unknown@unknown') return input.email!.trim()
  if (!isPlaceholderValue(input.company)) return input.company!.trim()
  if (input.projectType?.trim()) return input.projectType.trim()
  return 'Untitled response'
}

export function labeledAnswers(questions: QuestionData[], answers: Answers): [string, string][] {
  const seen = new Set<string>()
  const rows: [string, string][] = []

  for (const question of questions) {
    if (!isValueAnswered(answers[question.id])) continue
    seen.add(question.id)
    rows.push([question.question, formatAnswerValue(answers[question.id])])
  }

  for (const [id, value] of Object.entries(answers)) {
    if (seen.has(id) || !isValueAnswered(value)) continue
    rows.push([id, formatAnswerValue(value)])
  }

  return rows
}

export function computeClarity(questions: QuestionData[], answers: Answers): number {
  const visible = getVisibleQuestions(questions, answers)
  const required = visible.filter((q) => q.required)
  if (!required.length) return visible.length ? 100 : 0
  const answered = required.filter((q) => isValueAnswered(answers[q.id])).length
  return Math.round((answered / required.length) * 100)
}

export function buildSnapshot(contact: ReturnType<typeof extractContact>): Record<string, string> {
  const snapshot: Record<string, string> = {}
  if (contact.name) snapshot.Name = contact.name
  if (contact.email) snapshot.Email = contact.email
  if (contact.company) snapshot.Company = contact.company
  if (contact.projectType) snapshot.Need = contact.projectType
  return snapshot
}
