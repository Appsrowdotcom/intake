import { getWorkspace } from './db'
import { responseTitle } from './contactFields'

type NewEntryNotice = {
  name: string
  email: string
  company: string
  projectType: string
  questionnaireName: string
  answers: [string, string][]
}

function asText(entry: NewEntryNotice): string {
  const lines = [
    `New intake response for ${entry.questionnaireName}.`,
    '',
    `Name: ${responseTitle(entry)}`,
    `Email: ${entry.email || '—'}`,
    `Company: ${entry.company || '—'}`,
    `Need: ${entry.projectType || '—'}`,
    '',
    'Answers:',
  ]
  for (const [question, answer] of entry.answers) {
    lines.push('', question, answer || '—')
  }
  return lines.join('\n')
}

export async function notifyAdminNewEntry(entry: NewEntryNotice): Promise<void> {
  const workspace = await getWorkspace()
  if (!workspace.notifyOnSubmit) return

  const to = (process.env.ADMIN_EMAIL || workspace.adminEmail || '').trim()
  if (!to) {
    console.warn('Skipping admin notification: no ADMIN_EMAIL or workspace admin email is set.')
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('Skipping admin notification: RESEND_API_KEY is not set.')
    return
  }

  const from = process.env.EMAIL_FROM || 'Appsrow Discovery <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `New intake: ${responseTitle(entry)}`,
      text: asText(entry),
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Admin email failed (${res.status}): ${detail.slice(0, 300)}`)
  }
}
