import { writeFileSync } from 'node:fs'
import { SEED_QUESTIONS } from '../src/lib/seedQuestions.ts'

function lit(value: string | null): string {
  if (value == null) return 'NULL'
  return `'${value.replace(/'/g, "''")}'`
}

function json(value: unknown): string {
  if (value == null) return 'NULL'
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`
}

const rows = SEED_QUESTIONS.map((question) =>
  `(${[
    lit(question.id),
    String(question.sortOrder),
    lit(question.kicker),
    lit(question.title),
    lit(question.description),
    lit(question.placeholder),
    lit(question.type),
    question.required ? 'true' : 'false',
    json(question.options),
    json(question.showRule),
    question.role ? lit(question.role) : 'NULL',
    question.isActive ? 'true' : 'false',
  ].join(', ')})`
).join(',\n')

const sql = `-- Seed the 69 Appsrow discovery questions.
-- Run this in the Neon SQL editor after schema.sql.
-- Safe to re-run: existing ids are left unchanged.

INSERT INTO questions (
  id, sort_order, kicker, title, description, placeholder, type, required, options, show_rule, role, is_active
)
VALUES
${rows}
ON CONFLICT (id) DO NOTHING;
`

writeFileSync(new URL('../src/lib/seed-questions.sql', import.meta.url), sql)
console.log(`wrote ${SEED_QUESTIONS.length} rows`)
