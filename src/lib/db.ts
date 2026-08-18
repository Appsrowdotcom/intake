import { neon, NeonQueryFunction } from '@neondatabase/serverless'
import {
  createQuestionId,
  parseOptions,
  parseShowRule,
  type Question,
  type QuestionRole,
  type QuestionType,
  type ShowRule,
} from './questions'
import { SEED_QUESTIONS } from './seedQuestions'

let sql: NeonQueryFunction<false, false> | null = null

function normalizeDatabaseUrl(value: string): string {
  let url = value.trim().replace(/^["']|["']$/g, '')
  if (url.startsWith('postgresql:postgresql://') || url.startsWith('postgres:postgresql://')) {
    url = url.replace(/^postgres(ql)?:/, '')
  }
  return url
}

export function getDb() {
  if (sql) return sql

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL. Add it to .env.local.')
  }

  sql = neon(normalizeDatabaseUrl(databaseUrl))
  return sql
}

export type SubmissionListItem = {
  id: string
  created_at: string
  full_name: string
  email: string
  company_name: string
  relationship: string | null
  project_type: string | null
}

export type Submission = SubmissionListItem & {
  answers: Record<string, string | string[]>
}

export async function insertSubmission(input: {
  fullName: string
  email: string
  companyName: string
  relationship: string | null
  projectType: string | null
  answers: Record<string, string | string[]>
}): Promise<{ id: string }> {
  const db = getDb()
  const rows = await db.query(
    `INSERT INTO submissions (full_name, email, company_name, relationship, project_type, answers)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id`,
    [
      input.fullName,
      input.email,
      input.companyName,
      input.relationship,
      input.projectType,
      JSON.stringify(input.answers),
    ]
  )
  return { id: String(rows[0].id) }
}

export async function listSubmissions(): Promise<SubmissionListItem[]> {
  const db = getDb()
  const rows = await db`
    SELECT id, created_at, full_name, email, company_name, relationship, project_type
    FROM submissions
    ORDER BY created_at DESC
  `
  return rows as SubmissionListItem[]
}

export async function getSubmission(id: string): Promise<Submission | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return null
  }
  const db = getDb()
  const rows = await db`
    SELECT id, created_at, full_name, email, company_name, relationship, project_type, answers
    FROM submissions
    WHERE id = ${id}
    LIMIT 1
  `
  if (!rows[0]) return null
  return rows[0] as Submission
}

function asBoolean(value: unknown, fallback = true): boolean {
  if (value === false || value === 0 || value === 'false' || value === 'f') return false
  if (value === true || value === 1 || value === 'true' || value === 't') return true
  return fallback
}

function mapQuestionRow(row: Record<string, unknown>): Question {
  return {
    id: String(row.id),
    sortOrder: Number(row.sort_order),
    kicker: String(row.kicker ?? ''),
    title: String(row.title),
    description: row.description == null ? null : String(row.description),
    placeholder: row.placeholder == null ? null : String(row.placeholder),
    type: row.type as QuestionType,
    required: asBoolean(row.required, false),
    options: parseOptions(row.options),
    showRule: parseShowRule(row.show_rule),
    role: (row.role as QuestionRole | null) || null,
    isActive: asBoolean(row.is_active, true),
  }
}

export async function ensureQuestionsSeeded(): Promise<void> {
  const db = getDb()
  const countRows = await db`SELECT COUNT(*)::int AS count FROM questions`
  const count = Number(countRows[0]?.count ?? 0)
  if (count > 0) return

  for (const question of SEED_QUESTIONS) {
    await insertQuestionRow(question)
  }
}

async function insertQuestionRow(question: Question): Promise<void> {
  const db = getDb()
  await db.query(
    `INSERT INTO questions (
      id, sort_order, kicker, title, description, placeholder, type, required, options, show_rule, role, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12)`,
    [
      question.id,
      question.sortOrder,
      question.kicker,
      question.title,
      question.description,
      question.placeholder,
      question.type,
      question.required,
      JSON.stringify(question.options),
      question.showRule ? JSON.stringify(question.showRule) : null,
      question.role,
      question.isActive,
    ]
  )
}

export async function listQuestions(activeOnly = false): Promise<Question[]> {
  await ensureQuestionsSeeded()
  const db = getDb()
  const rows = activeOnly
    ? await db`SELECT * FROM questions WHERE is_active = true ORDER BY sort_order ASC`
    : await db`SELECT * FROM questions ORDER BY sort_order ASC`
  return (rows as Record<string, unknown>[]).map(mapQuestionRow)
}

export type QuestionInput = {
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

async function clearRole(role: QuestionRole | null, exceptId?: string): Promise<void> {
  if (!role) return
  const db = getDb()
  if (exceptId) {
    await db`UPDATE questions SET role = NULL WHERE role = ${role} AND id <> ${exceptId}`
    return
  }
  await db`UPDATE questions SET role = NULL WHERE role = ${role}`
}

export async function createQuestion(input: QuestionInput, id?: string): Promise<Question> {
  await ensureQuestionsSeeded()
  const db = getDb()
  const maxRows = await db`SELECT COALESCE(MAX(sort_order), 0)::int AS max FROM questions`
  const sortOrder = Number(maxRows[0]?.max ?? 0) + 1
  const question: Question = {
    id: id || createQuestionId(),
    sortOrder,
    ...input,
  }
  await clearRole(question.role)
  await insertQuestionRow(question)
  return question
}

function isSafeQuestionId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(id)
}

export async function updateQuestion(id: string, input: QuestionInput): Promise<Question | null> {
  if (!isSafeQuestionId(id)) return null
  const db = getDb()
  const existing = await db`SELECT sort_order FROM questions WHERE id = ${id} LIMIT 1`
  if (!existing[0]) return null
  await clearRole(input.role, id)
  await db.query(
    `UPDATE questions SET
      kicker = $2,
      title = $3,
      description = $4,
      placeholder = $5,
      type = $6,
      required = $7,
      options = $8::jsonb,
      show_rule = $9::jsonb,
      role = $10,
      is_active = $11
    WHERE id = $1`,
    [
      id,
      input.kicker,
      input.title,
      input.description,
      input.placeholder,
      input.type,
      input.required,
      JSON.stringify(input.options),
      input.showRule ? JSON.stringify(input.showRule) : null,
      input.role,
      input.isActive,
    ]
  )
  const rows = await db`SELECT * FROM questions WHERE id = ${id} LIMIT 1`
  return rows[0] ? mapQuestionRow(rows[0] as Record<string, unknown>) : null
}

export async function deleteQuestion(id: string): Promise<{ ok: true } | { ok: false; referencedBy: string[] }> {
  if (!isSafeQuestionId(id)) return { ok: false, referencedBy: [] }
  const questions = await listQuestions(false)
  const referencedBy = questions
    .filter((question) => question.id !== id)
    .filter((question) => question.showRule?.conditions.some((condition) => condition.questionId === id))
    .map((question) => question.id)

  if (referencedBy.length > 0) {
    return { ok: false, referencedBy }
  }

  const db = getDb()
  await db`DELETE FROM questions WHERE id = ${id}`
  return { ok: true }
}

export async function reorderQuestions(ids: string[]): Promise<Question[]> {
  const existing = await listQuestions(false)
  const existingIds = new Set(existing.map((question) => question.id))
  const unique = [...new Set(ids.filter(isSafeQuestionId))]
  if (unique.length !== existing.length || unique.some((id) => !existingIds.has(id))) {
    return existing
  }

  const db = getDb()
  for (let index = 0; index < unique.length; index += 1) {
    await db`UPDATE questions SET sort_order = ${index + 1} WHERE id = ${unique[index]}`
  }
  return listQuestions(false)
}

export async function duplicateQuestion(id: string): Promise<Question | null> {
  if (!isSafeQuestionId(id)) return null
  const questions = await listQuestions(false)
  const source = questions.find((question) => question.id === id)
  if (!source) return null
  return createQuestion({
    kicker: source.kicker,
    title: `${source.title} (copy)`,
    description: source.description,
    placeholder: source.placeholder,
    type: source.type,
    required: source.required,
    options: source.options,
    showRule: source.showRule,
    role: null,
    isActive: source.isActive,
  })
}
