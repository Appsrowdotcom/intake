import type { ResponseData } from './questions'
import { responseTitle } from './contactFields'

function csvCell(value: string): string {
  const text = value.replace(/\r?\n/g, ' ').trim()
  if (/[",]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function uniqueQuestions(responses: ResponseData[]): string[] {
  const seen = new Set<string>()
  const questions: string[] = []
  for (const response of responses) {
    for (const [question] of response.answers) {
      if (!seen.has(question)) {
        seen.add(question)
        questions.push(question)
      }
    }
  }
  return questions
}

function answerMap(response: ResponseData): Record<string, string> {
  return Object.fromEntries(response.answers)
}

export function responsesToCsv(responses: ResponseData[]): string {
  const questions = uniqueQuestions(responses)
  const headers = ['Submitted', 'Name', 'Email', 'Company', 'Project type', 'Status', 'Questionnaire', ...questions]
  const lines = [headers.map(csvCell).join(',')]

  for (const response of responses) {
    const answers = answerMap(response)
    const row = [
      response.createdAt || response.submittedAt,
      responseTitle(response),
      isUnknownEmail(response.email) ? '' : response.email,
      isDash(response.company) ? '' : response.company,
      response.projectType,
      response.status,
      response.questionnaireName || '',
      ...questions.map((question) => answers[question] || ''),
    ]
    lines.push(row.map(csvCell).join(','))
  }

  return `\uFEFF${lines.join('\r\n')}`
}

export function responsesToJson(responses: ResponseData[]): string {
  return JSON.stringify(responses.map((response) => ({
    id: response.id,
    submittedAt: response.createdAt || response.submittedAt,
    name: responseTitle(response),
    email: isUnknownEmail(response.email) ? '' : response.email,
    company: isDash(response.company) ? '' : response.company,
    projectType: response.projectType,
    status: response.status,
    questionnaire: response.questionnaireName || '',
    clarity: response.clarity,
    answers: Object.fromEntries(response.answers),
  })), null, 2)
}

export function responsesToMarkdown(responses: ResponseData[]): string {
  if (!responses.length) return '# Responses\n\nNo responses to export.\n'

  return responses.map((response) => {
    const lines = [
      `# ${responseTitle(response)}`,
      '',
      `- Submitted: ${response.createdAt || response.submittedAt}`,
      `- Status: ${response.status}`,
      `- Questionnaire: ${response.questionnaireName || '—'}`,
      `- Email: ${isUnknownEmail(response.email) ? '—' : response.email}`,
      `- Company: ${isDash(response.company) ? '—' : response.company}`,
      `- Project type: ${response.projectType || '—'}`,
      '',
      '## Answers',
      '',
    ]
    for (const [question, answer] of response.answers) {
      lines.push(`### ${question}`, '', answer || '—', '')
    }
    return lines.join('\n')
  }).join('\n---\n\n')
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function exportResponses(responses: ResponseData[], format: 'excel' | 'json' | 'md', basename: string) {
  const stamp = new Date().toISOString().slice(0, 10)
  const safe = basename.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'export'
  if (format === 'excel') {
    downloadTextFile(`${safe}-${stamp}.csv`, responsesToCsv(responses), 'text/csv;charset=utf-8')
    return
  }
  if (format === 'json') {
    downloadTextFile(`${safe}-${stamp}.json`, responsesToJson(responses), 'application/json')
    return
  }
  downloadTextFile(`${safe}-${stamp}.md`, responsesToMarkdown(responses), 'text/markdown;charset=utf-8')
}

function isDash(value: string): boolean {
  return !value || value === '—' || value === '-'
}

function isUnknownEmail(value: string): boolean {
  return !value || value === 'unknown@unknown'
}
