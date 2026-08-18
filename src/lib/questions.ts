export type QuestionType = 'text' | 'email' | 'url' | 'textarea' | 'single' | 'multi'

export type QuestionRole = 'full_name' | 'email' | 'company' | 'relationship' | 'project_type'

export type AnswerValue = string | string[]
export type Answers = Record<string, AnswerValue>

export type ShowOperator = 'eq' | 'neq' | 'in' | 'contains' | 'answered'

export type ShowCondition = {
  questionId: string
  operator: ShowOperator
  value?: string | string[]
}

export type ShowRule = {
  combinator: 'and' | 'or'
  conditions: ShowCondition[]
}

export type Question = {
  id: string
  sortOrder: number
  kicker: string
  title: string
  description: string | null
  placeholder: string | null
  type: QuestionType
  required: boolean
  options: string[]
  showRule: ShowRule | null
  role: QuestionRole | null
  isActive: boolean
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Short text',
  textarea: 'Long text',
  email: 'Email',
  url: 'URL',
  single: 'Single select',
  multi: 'Multi select',
}

export const QUESTION_ROLES: { value: QuestionRole; label: string }[] = [
  { value: 'full_name', label: 'Full name' },
  { value: 'email', label: 'Email' },
  { value: 'company', label: 'Company' },
  { value: 'relationship', label: 'Relationship' },
  { value: 'project_type', label: 'Project type' },
]

export const SHOW_OPERATOR_LABELS: Record<ShowOperator, string> = {
  eq: 'is',
  neq: 'is not',
  in: 'is one of',
  contains: 'includes',
  answered: 'is answered',
}

export function getString(answers: Answers, id: string): string {
  const value = answers[id]
  return typeof value === 'string' ? value : ''
}

export function getArray(answers: Answers, id: string): string[] {
  const value = answers[id]
  return Array.isArray(value) ? value : []
}

export function isAnswered(question: Pick<Question, 'id'>, answers: Answers): boolean {
  return isValueAnswered(answers[question.id])
}

export function isValueAnswered(value: AnswerValue | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0
  return value !== undefined && String(value).trim() !== ''
}

export function evaluateCondition(condition: ShowCondition, answers: Answers): boolean {
  const answered = isValueAnswered(answers[condition.questionId])
  const text = getString(answers, condition.questionId)
  const list = getArray(answers, condition.questionId)

  switch (condition.operator) {
    case 'answered':
      return answered
    case 'eq':
      return answered && text === condition.value
    case 'neq':
      return answered && text !== condition.value
    case 'in':
      return answered && Array.isArray(condition.value) && condition.value.includes(text)
    case 'contains':
      return typeof condition.value === 'string' && list.includes(condition.value)
    default:
      return false
  }
}

export function evaluateShowRule(rule: ShowRule | null | undefined, answers: Answers): boolean {
  if (!rule || rule.conditions.length === 0) return true
  if (rule.combinator === 'or') {
    return rule.conditions.some((condition) => evaluateCondition(condition, answers))
  }
  return rule.conditions.every((condition) => evaluateCondition(condition, answers))
}

export function getVisibleQuestions(questions: Question[], answers: Answers): Question[] {
  return questions.filter((question) => question.isActive && evaluateShowRule(question.showRule, answers))
}

export function formatAnswer(value: AnswerValue | undefined): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.join(', ')
  return value
}

export function collectVisibleAnswers(questions: Question[], answers: Answers): Answers {
  const visible = getVisibleQuestions(questions, answers)
  const payload: Answers = {}

  for (const question of visible) {
    if (isAnswered(question, answers)) {
      payload[question.id] = answers[question.id]
    }
  }

  return payload
}

export function questionsById(questions: Question[]): Record<string, Question> {
  return Object.fromEntries(questions.map((question) => [question.id, question]))
}

export function getRoleValue(questions: Question[], answers: Answers, role: QuestionRole): string {
  const question = questions.find((item) => item.role === role)
  if (!question) return ''
  return formatAnswer(answers[question.id]).trim()
}

export function parseShowRule(value: unknown): ShowRule | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const rule = value as Partial<ShowRule>
  if (rule.combinator !== 'and' && rule.combinator !== 'or') return null
  if (!Array.isArray(rule.conditions)) return null
  const conditions = rule.conditions.filter((condition): condition is ShowCondition => {
    if (!condition || typeof condition !== 'object') return false
    if (typeof condition.questionId !== 'string') return false
    return ['eq', 'neq', 'in', 'contains', 'answered'].includes(condition.operator)
  })
  if (conditions.length === 0) return null
  return { combinator: rule.combinator, conditions }
}

export function parseOptions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  if (typeof value === 'string') {
    try {
      return parseOptions(JSON.parse(value))
    } catch {
      return []
    }
  }
  return []
}

export function isChoiceType(type: QuestionType): boolean {
  return type === 'single' || type === 'multi'
}

export function createQuestionId(): string {
  return `q_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}
