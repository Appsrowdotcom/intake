'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppsrowLogo } from '@/components/AppsrowLogo'
import {
  type QuestionnaireData,
  type SectionData,
  type QuestionData,
  type ResponseData,
  type WorkspaceSettings,
  type ThemePreset,
  type ShowOperator,
  SUPPORTED_TYPES,
  OPERATORS,
  TYPE_LABELS,
  isChoiceType,
  qCount,
  logicCount,
  slugify,
  isValidSlug,
} from '@/lib/questions'

type Page = 'questionnaires' | 'editor' | 'responses' | 'response-detail' | 'settings'

export function AdminWorkspace({
  initialQuestionnaires,
  initialResponses,
  initialWorkspace,
}: {
  initialQuestionnaires: QuestionnaireData[]
  initialResponses: ResponseData[]
  initialWorkspace: WorkspaceSettings
}) {
  const router = useRouter()
  const [questionnaires, setQuestionnaires] = useState(initialQuestionnaires)
  const [responses, setResponses] = useState(initialResponses)
  const [workspace, setWorkspace] = useState(initialWorkspace)
  const [page, setPage] = useState<Page>('questionnaires')
  const [currentQId, setCurrentQId] = useState(questionnaires[0]?.id || '')
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null)
  const [currentResponseId, setCurrentResponseId] = useState<string | null>(null)
  const [questionFilter, setQuestionFilter] = useState('all')
  const [questionSearch, setQuestionSearch] = useState('')
  const [responseFilter, setResponseFilter] = useState('all')
  const [responseSearch, setResponseSearch] = useState('')
  const [qSearch, setQSearch] = useState('')
  const [qStatusFilter, setQStatusFilter] = useState('all')
  const [toast, setToast] = useState('')
  const [editorTab, setEditorTab] = useState<'questions' | 'design' | 'settings'>('questions')
  const [showCreateModal, setShowCreateModal] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  function showError(err: unknown) {
    showToast(err instanceof Error ? err.message : 'Something went wrong.')
  }

  const currentQ = useMemo(() => questionnaires.find((q) => q.id === currentQId), [questionnaires, currentQId])
  const currentResponse = useMemo(() => responses.find((r) => r.id === currentResponseId), [responses, currentResponseId])

  function goPage(p: Page) {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openEditor(id: string) {
    setCurrentQId(id)
    const q = questionnaires.find((x) => x.id === id)
    const firstQ = q?.sections.flatMap((s) => s.questions)[0]
    setCurrentQuestionId(firstQ?.id || null)
    setQuestionFilter('all')
    setQuestionSearch('')
    setEditorTab('questions')
    goPage('editor')
  }

  function openResponseDetail(rid: string) {
    setCurrentResponseId(rid)
    goPage('response-detail')
  }

  function publicUrl(q: QuestionnaireData) {
    const base = workspace.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    return 'https://' + base + '/' + q.slug.replace(/^\//, '')
  }

  async function copyText(text: string, msg: string) {
    try { await navigator.clipboard.writeText(text); showToast(msg) } catch { showToast(text) }
  }

  async function handleLogout() {
    try {
      await fetch('/api/adl/logout', { method: 'POST' })
      router.refresh()
    } catch (err) { showError(err) }
  }

  async function toggleStatus(q: QuestionnaireData) {
    try {
      const newStatus = q.status === 'live' ? 'draft' : 'live'
      const res = await fetch(`/api/adl/questionnaires/${q.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) { showToast('Failed to update status'); return }
      const data = await res.json() as { questionnaire: QuestionnaireData }
      setQuestionnaires((prev) => prev.map((x) => x.id === q.id ? data.questionnaire : x))
      showToast(newStatus === 'live' ? 'Published' : 'Moved to draft')
    } catch (err) { showError(err) }
  }

  async function saveQuestion(q: QuestionnaireData, question: QuestionData) {
    try {
      const res = await fetch(`/api/adl/questions/${question.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(question),
      })
      if (!res.ok) { showToast('Failed to save question'); return }
      const data = await res.json() as { question: QuestionData }
      setQuestionnaires((prev) => prev.map((x) => {
        if (x.id !== q.id) return x
        return { ...x, sections: x.sections.map((s) => ({ ...s, questions: s.questions.map((sq) => sq.id === data.question.id ? data.question : sq) })) }
      }))
      showToast('Question saved')
    } catch (err) { showError(err) }
  }

  async function deleteSelectedQuestion(q: QuestionnaireData, qid: string) {
    if (!confirm('Delete this question?')) return
    try {
      const res = await fetch(`/api/adl/questions/${qid}`, { method: 'DELETE' })
      if (!res.ok) { showToast('Failed to delete question'); return }
      setQuestionnaires((prev) => prev.map((x) => {
        if (x.id !== q.id) return x
        return { ...x, sections: x.sections.map((s) => ({ ...s, questions: s.questions.filter((sq) => sq.id !== qid) })) }
      }))
      setCurrentQuestionId(null)
      showToast('Question deleted')
    } catch (err) { showError(err) }
  }

  async function addNewQuestion(q: QuestionnaireData, sectionId: string) {
    try {
      const res = await fetch(`/api/adl/questionnaires/${q.id}/questions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, type: 'short_text', question: 'Untitled question' }),
      })
      if (!res.ok) { showToast('Failed to add question'); return }
      const data = await res.json() as { question: QuestionData }
      setQuestionnaires((prev) => prev.map((x) => {
        if (x.id !== q.id) return x
        return { ...x, sections: x.sections.map((s) => s.id === sectionId ? { ...s, questions: [...s.questions, data.question] } : s) }
      }))
      setCurrentQuestionId(data.question.id)
      showToast('Question added')
    } catch (err) { showError(err) }
  }

  async function addNewSection(q: QuestionnaireData, title: string) {
    try {
      const res = await fetch(`/api/adl/questionnaires/${q.id}/sections`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) { showToast('Failed to add section'); return }
      const data = await res.json() as { section: SectionData }
      setQuestionnaires((prev) => prev.map((x) => x.id === q.id ? { ...x, sections: [...x.sections, { ...data.section, questions: [] }] } : x))
      showToast('Section added')
    } catch (err) { showError(err) }
  }

  async function toggleResponseStatus(r: ResponseData) {
    try {
      const newStatus = r.status === 'reviewed' ? 'new' : 'reviewed'
      const res = await fetch(`/api/adl/responses/${r.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) { showToast('Failed to update status'); return }
      setResponses((prev) => prev.map((x) => x.id === r.id ? { ...x, status: newStatus } : x))
      showToast(newStatus === 'reviewed' ? 'Marked reviewed' : 'Marked new')
    } catch (err) { showError(err) }
  }

  async function handleCreateQuestionnaire(input: { name: string; slug: string; purpose: string; mode: string }) {
    try {
      const res = await fetch('/api/adl/questionnaires', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json() as { questionnaire?: QuestionnaireData; error?: string }
      if (!res.ok || !data.questionnaire) { showToast(data.error || 'Failed to create'); return }
      setQuestionnaires((prev) => [...prev, data.questionnaire!])
      setShowCreateModal(false)
      showToast('Questionnaire created')
      openEditor(data.questionnaire.id)
    } catch (err) { showError(err) }
  }

  const filteredQuestionnaires = useMemo(() => {
    const query = qSearch.toLowerCase()
    return questionnaires
      .filter((q) => !q.isDefault)
      .filter((q) => !query || q.name.toLowerCase().includes(query) || q.purpose.toLowerCase().includes(query))
      .filter((q) => qStatusFilter === 'all' || q.status === qStatusFilter)
  }, [questionnaires, qSearch, qStatusFilter])

  const defaultQ = useMemo(() => questionnaires.find((q) => q.isDefault), [questionnaires])

  const filteredResponses = useMemo(() => {
    const query = responseSearch.toLowerCase()
    return responses
      .filter((r) => responseFilter === 'all' || r.status === responseFilter)
      .filter((r) => !query || `${r.name} ${r.company} ${r.projectType} ${r.questionnaireName || ''}`.toLowerCase().includes(query))
  }, [responses, responseFilter, responseSearch])

  const responseCounts = useMemo(() => ({
    all: responses.length,
    new: responses.filter((r) => r.status === 'new').length,
    reviewed: responses.filter((r) => r.status === 'reviewed').length,
    incomplete: responses.filter((r) => r.status === 'incomplete').length,
  }), [responses])

  const currentQuestion = useMemo(() => {
    if (!currentQ || !currentQuestionId) return null
    for (const s of currentQ.sections) {
      const q = s.questions.find((x) => x.id === currentQuestionId)
      if (q) return { ...q, sectionId: s.id }
    }
    return null
  }, [currentQ, currentQuestionId])

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Header */}
      <div className="sticky top-0 z-[60] border-b border-line bg-canvas/[.96]">
        <header className="mx-auto grid h-auto min-h-[80px] max-w-[1360px] grid-cols-[1fr_auto] items-center gap-4 px-4 py-2 md:grid-cols-[190px_1fr_auto] md:px-6">
          <button onClick={() => goPage('questionnaires')} className="flex items-center">
            <AppsrowLogo className="h-auto w-[130px] md:w-[154px]" />
          </button>
          <nav className="order-3 col-span-full flex items-center gap-6 overflow-auto border-t border-line pt-2 md:order-none md:col-span-1 md:justify-center md:border-0 md:pt-0 lg:gap-8">
            {(['questionnaires', 'responses', 'settings'] as const).map((p) => (
              <button
                key={p}
                onClick={() => goPage(p)}
                className={`relative shrink-0 border-0 bg-transparent px-0 py-4 text-[15px] font-semibold md:py-6 ${page === p || (p === 'questionnaires' && page === 'editor') ? 'text-ink' : 'text-muted'}`}
              >
                {p[0].toUpperCase() + p.slice(1)}
                {(page === p || (p === 'questionnaires' && page === 'editor')) && (
                  <span className="absolute inset-x-0 bottom-0 h-[3px] bg-red" />
                )}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button className="btn btn-red btn-sm md:btn-sm" onClick={() => setShowCreateModal(true)}>Create questionnaire</button>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Lock</button>
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-[1360px] px-4 pb-24 pt-8 md:px-6 md:pt-12">
        {/* --- QUESTIONNAIRES --- */}
        {page === 'questionnaires' && (
          <div>
            <div className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between md:gap-8">
              <div>
                <div className="kicker">Appsrow Discovery</div>
                <h1 className="mt-2 text-[clamp(32px,4.6vw,56px)] font-semibold leading-none tracking-[-0.045em]">Questionnaires</h1>
                <p className="mt-4 max-w-[760px] text-base leading-relaxed text-muted">Build focused discovery flows, collect structured responses, and turn client input into clearer project decisions.</p>
              </div>
            </div>

            {defaultQ && (
              <div className="relative mb-8 border border-ink bg-white p-4 shadow-[8px_8px_0_rgba(2,2,2,.05)] md:mb-12 md:p-8">
                <div className="absolute -left-px -right-px -top-px h-1 bg-red" />
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
                  <div>
                    <div className="kicker mb-2">Default questionnaire · {defaultQ.status}</div>
                    <h2 className="text-[24px] font-semibold leading-tight tracking-tight md:text-[32px]">{defaultQ.name}</h2>
                    <p className="mb-4 mt-2 max-w-[760px] text-muted">{defaultQ.purpose}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted md:gap-4">
                      <strong className="font-semibold text-ink">{qCount(defaultQ.sections)} questions</strong>
                      <span>{logicCount(defaultQ.sections)} conditional</span>
                      <span>{responses.filter((r) => r.questionnaireId === defaultQ.id).length} responses</span>
                      <span className="mono">/{defaultQ.slug}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => copyText(publicUrl(defaultQ), 'Link copied')}>Copy link</button>
                    <button className="btn btn-red btn-sm" onClick={() => openEditor(defaultQ.id)}>Edit</button>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
              <div>
                <h2 className="text-[24px] font-semibold leading-tight tracking-tight md:text-[30px]">Your questionnaires</h2>
                <p className="text-sm text-muted">Client-specific and purpose-built discovery flows.</p>
              </div>
            </div>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
              <input className="input w-full md:w-80" placeholder="Search questionnaires" value={qSearch} onChange={(e) => setQSearch(e.target.value)} />
              <select className="v6-select w-full md:w-40" value={qStatusFilter} onChange={(e) => setQStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="live">Live</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div className="border-t border-ink">
              {filteredQuestionnaires.length === 0 ? (
                <div className="border border-dashed border-line-strong bg-white p-8 text-center md:p-12">
                  <h3 className="text-[22px] font-semibold">No questionnaires found.</h3>
                  <p className="mx-auto mb-6 mt-2 max-w-[520px] text-muted">Change your search or create a focused client questionnaire.</p>
                  <button className="btn btn-red" onClick={() => setShowCreateModal(true)}>Create questionnaire</button>
                </div>
              ) : filteredQuestionnaires.map((q) => (
                <button key={q.id} onClick={() => openEditor(q.id)} className="grid w-full cursor-pointer grid-cols-[1fr_40px] items-center gap-3 border-b border-line px-2 py-4 text-left transition hover:bg-white hover:px-4 md:grid-cols-[minmax(0,1.4fr)_minmax(180px,.7fr)_130px_150px_40px] md:gap-4 md:py-6">
                  <div>
                    <div className="text-[15px] font-semibold md:text-[17px]">{q.name}</div>
                    <div className="text-[13px] text-muted">{q.purpose}</div>
                  </div>
                  <div className="hidden mono text-[13px] text-muted md:block">/{q.slug}</div>
                  <div className="hidden md:block"><span className={`font-mono text-[10px] font-semibold uppercase tracking-wide ${q.status === 'live' ? 'text-red' : 'text-muted'}`}>{q.status}</span></div>
                  <div className="hidden text-[13px] text-muted md:block">{responses.filter((r) => r.questionnaireId === q.id).length} responses</div>
                  <div className="text-right text-xl">→</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* --- EDITOR --- */}
        {page === 'editor' && currentQ && (
          <div>
            <div className="mb-6 flex items-center gap-2 text-[13px] text-muted">
              <button onClick={() => goPage('questionnaires')} className="hover:text-red">Questionnaires</button>
              <span>/</span>
              <span>{currentQ.name}</span>
            </div>
            <div className="flex flex-col gap-4 border-b border-ink pb-6 md:flex-row md:items-end md:justify-between md:gap-8">
              <div>
                <div className="kicker">Questionnaire · {currentQ.status}</div>
                <h1 className="mt-2 text-[28px] font-semibold leading-none tracking-tight md:text-[40px]">{currentQ.name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-muted md:gap-4">
                  <span className="mono">/{currentQ.slug}</span>
                  <span>{qCount(currentQ.sections)} questions</span>
                  <span>{responses.filter((r) => r.questionnaireId === currentQ.id).length} responses</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => copyText(publicUrl(currentQ), 'Link copied')}>Copy link</button>
                <button className="btn btn-red btn-sm" onClick={() => toggleStatus(currentQ)}>
                  {currentQ.status === 'live' ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </div>

            <div className="flex gap-6 overflow-auto border-b border-line md:gap-8">
              {(['questions', 'design', 'settings'] as const).map((tab) => (
                <button key={tab} onClick={() => setEditorTab(tab)} className={`relative shrink-0 border-0 bg-transparent px-0 py-4 text-[15px] ${editorTab === tab ? 'font-semibold text-ink' : 'text-muted'}`}>
                  {tab[0].toUpperCase() + tab.slice(1)}
                  {editorTab === tab && <span className="absolute inset-x-0 -bottom-px h-[3px] bg-red" />}
                </button>
              ))}
            </div>

            {editorTab === 'questions' && (
              <div className="mt-6">
                <div className="grid min-h-[400px] grid-cols-1 border border-line-strong bg-white shadow-[8px_8px_0_rgba(2,2,2,.035)] lg:min-h-[680px] lg:grid-cols-[360px_minmax(0,1fr)]">
                  <aside className="flex min-w-0 flex-col border-b border-line lg:border-b-0 lg:border-r">
                    <div className="border-b border-line p-4 md:p-6">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-lg font-semibold">Questions</h3>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost btn-sm" onClick={() => {
                            const title = prompt('Section title:')
                            if (title) addNewSection(currentQ, title)
                          }}>+ Section</button>
                          <button className="btn btn-red btn-sm" onClick={() => {
                            const section = currentQ.sections[0]
                            if (section) addNewQuestion(currentQ, section.id)
                            else showToast('Add a section first')
                          }}>+ Question</button>
                        </div>
                      </div>
                      <input className="input" style={{ height: 40 }} placeholder="Search questions" value={questionSearch} onChange={(e) => setQuestionSearch(e.target.value)} />
                      <div className="mt-4 flex flex-wrap gap-3 md:gap-4">
                        {['all', 'required', 'conditional', 'inactive'].map((f) => (
                          <button key={f} onClick={() => setQuestionFilter(f)} className={`border-0 bg-transparent p-0 font-mono text-[10px] font-semibold uppercase tracking-wide ${questionFilter === f ? 'text-red' : 'text-muted'}`}>{f}</button>
                        ))}
                      </div>
                    </div>
                    <div className="max-h-[420px] overflow-auto pb-4 lg:max-h-[640px]">
                      {currentQ.sections.map((s, si) => {
                        const filtered = s.questions.filter((q) => {
                          const search = questionSearch.toLowerCase()
                          const hit = !search || (q.question + ' ' + (q.helpText || '')).toLowerCase().includes(search)
                          const cond = !!q.logic?.showWhen?.conditions?.length
                          const match = questionFilter === 'all' ||
                            (questionFilter === 'required' && q.required) ||
                            (questionFilter === 'conditional' && cond) ||
                            (questionFilter === 'inactive' && !q.active)
                          return hit && match
                        })
                        if (!filtered.length && (questionSearch || questionFilter !== 'all')) return null
                        return (
                          <div key={s.id} className="border-b border-line">
                            <div className="flex w-full items-center justify-between bg-surface-muted px-4 py-3 text-left md:px-6 md:py-4">
                              <strong className="text-xs uppercase tracking-wider">{String(si + 1).padStart(2, '0')} · {s.title}</strong>
                              <span className="mono text-[10px] text-muted">{filtered.length}/{s.questions.length}</span>
                            </div>
                            {filtered.map((q) => {
                              const cond = !!q.logic?.showWhen?.conditions?.length
                              const active = currentQuestionId === q.id
                              return (
                                <button
                                  key={q.id}
                                  onClick={() => setCurrentQuestionId(q.id)}
                                  className={`grid w-full grid-cols-[16px_minmax(0,1fr)_auto] items-start gap-2 border-0 px-4 py-3 text-left md:px-6 md:py-4 ${active ? 'bg-ink text-white' : 'bg-transparent hover:bg-canvas'}`}
                                >
                                  <span className="text-xs tracking-[-2px] text-muted">⋮⋮</span>
                                  <span className="text-[13px] font-medium leading-snug">{q.question}</span>
                                  <span className="flex items-center gap-1">
                                    {q.required && <span className={`font-mono text-[9px] font-semibold uppercase ${active ? 'text-[#FF8389]' : 'text-red'}`}>Required</span>}
                                    {cond && <span className={`font-mono text-[9px] font-semibold uppercase ${active ? 'text-[#FF8389]' : 'text-red'}`}>IF</span>}
                                    {!q.active && <span className={`font-mono text-[9px] font-semibold uppercase ${active ? 'text-[#FF8389]' : 'text-red'}`}>Off</span>}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </aside>

                  <section className="min-w-0 p-4 md:p-8">
                    {currentQuestion ? (
                      <QuestionInspector
                        question={currentQuestion}
                        allQuestions={currentQ.sections.flatMap((s) => s.questions)}
                        onSave={(q) => saveQuestion(currentQ, q)}
                        onDelete={() => deleteSelectedQuestion(currentQ, currentQuestion.id)}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted">Select a question to edit.</div>
                    )}
                  </section>
                </div>
              </div>
            )}

            {editorTab === 'design' && (
              <DesignTab questionnaire={currentQ} onUpdate={async (theme) => {
                try {
                  const res = await fetch(`/api/adl/questionnaires/${currentQ.id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ theme }),
                  })
                  if (!res.ok) { showToast('Failed to save design'); return }
                  const data = await res.json() as { questionnaire: QuestionnaireData }
                  setQuestionnaires((prev) => prev.map((x) => x.id === currentQ.id ? data.questionnaire : x))
                  showToast('Design saved')
                } catch (err) { showError(err) }
              }} />
            )}

            {editorTab === 'settings' && (
              <QuestionnaireSettingsTab
                questionnaire={currentQ}
                onSave={async (input) => {
                  try {
                    const res = await fetch(`/api/adl/questionnaires/${currentQ.id}`, {
                      method: 'PUT', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(input),
                    })
                    if (!res.ok) { showToast('Failed to save settings'); return }
                    const data = await res.json() as { questionnaire: QuestionnaireData }
                    setQuestionnaires((prev) => prev.map((x) => x.id === currentQ.id ? data.questionnaire : x))
                    showToast('Settings saved')
                  } catch (err) { showError(err) }
                }}
              />
            )}
          </div>
        )}

        {/* --- RESPONSES --- */}
        {page === 'responses' && (
          <div>
            <div className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between md:gap-8">
              <div>
                <div className="kicker">Responses</div>
                <h1 className="mt-2 text-[clamp(32px,4.6vw,56px)] font-semibold leading-none tracking-[-0.045em]">Client submissions</h1>
                <p className="mt-4 max-w-[760px] text-base leading-relaxed text-muted">A focused inbox for what is new, what is clear, and what still needs a conversation.</p>
              </div>
              <input className="input w-full md:w-80" placeholder="Search responses" value={responseSearch} onChange={(e) => setResponseSearch(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
              <aside className="flex overflow-auto border-b border-line md:block md:border-b-0 md:border-t md:border-ink">
                {(['all', 'new', 'reviewed', 'incomplete'] as const).map((f) => (
                  <button key={f} onClick={() => setResponseFilter(f)} className={`flex w-auto min-w-max items-center gap-2 border-b-0 px-3 py-3 text-left md:w-full md:justify-between md:border-b md:border-line md:px-0 md:py-4 ${responseFilter === f ? 'font-semibold text-ink' : 'text-muted'}`}>
                    {f[0].toUpperCase() + f.slice(1)}
                    <span className="mono text-[11px]">{responseCounts[f]}</span>
                  </button>
                ))}
              </aside>
              <div className="border-t border-ink">
                {filteredResponses.length === 0 ? (
                  <div className="border border-dashed border-line-strong bg-white p-8 text-center md:p-12">
                    <h3 className="text-[22px] font-semibold">No responses here.</h3>
                    <p className="text-muted">Try another status or search.</p>
                  </div>
                ) : filteredResponses.map((r) => (
                  <button key={r.id} onClick={() => openResponseDetail(r.id)} className="grid w-full cursor-pointer grid-cols-[1fr_100px_40px] items-center gap-3 border-b border-line px-2 py-4 text-left hover:bg-white hover:px-4 md:grid-cols-[minmax(0,1.2fr)_minmax(140px,.65fr)_120px_120px_40px] md:gap-4 md:py-6">
                    <div>
                      <strong className="block text-base">{r.name}</strong>
                      <span className="text-[13px] text-muted">{r.company} · {r.questionnaireName}</span>
                    </div>
                    <div className="hidden text-[13px] text-muted md:block">{r.projectType}</div>
                    <div className="hidden md:block"><span className={`badge ${r.status === 'new' ? 'red' : ''}`}>{r.status}</span></div>
                    <div className="mono text-[11px] font-semibold text-red">{r.clarity}% clear</div>
                    <div className="text-right">→</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {page === 'response-detail' && currentResponse && (
          <ResponseDetailPage
            response={currentResponse}
            questionnaireName={responses.find((r) => r.id === currentResponseId)?.questionnaireName || ''}
            onBack={() => goPage('responses')}
            onToggleStatus={() => toggleResponseStatus(currentResponse)}
            onCopyEmail={() => copyText(currentResponse.email, 'Email copied')}
          />
        )}

        {page === 'settings' && (
          <WorkspaceSettingsPage
            workspace={workspace}
            onSave={async (input) => {
              try {
                const res = await fetch('/api/adl/workspace', {
                  method: 'PUT', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(input),
                })
                if (!res.ok) { showToast('Failed to save workspace'); return }
                const data = await res.json() as { workspace: WorkspaceSettings }
                setWorkspace(data.workspace)
                showToast('Workspace saved')
              } catch (err) { showError(err) }
            }}
          />
        )}
      </main>

      {/* Create modal */}
      {showCreateModal && <CreateQuestionnaireModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateQuestionnaire} />}

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  )
}

// --- Create Questionnaire Modal ---

function CreateQuestionnaireModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (input: { name: string; slug: string; purpose: string; mode: string }) => void
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [purpose, setPurpose] = useState('')
  const [mode, setMode] = useState<'universal' | 'blank'>('universal')
  const [error, setError] = useState('')

  function handleNameChange(v: string) {
    setName(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  function handleCreate() {
    const errors: string[] = []
    if (!name.trim()) errors.push('Name is required.')
    if (!isValidSlug(slug)) errors.push('Use a valid lowercase slug.')
    if (!purpose.trim()) errors.push('Purpose is required.')
    if (errors.length) { setError(errors.join(' ')); return }
    onCreate({ name: name.trim(), slug: slug.trim(), purpose: purpose.trim(), mode })
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[680px] max-h-[92vh] overflow-auto border border-ink bg-white shadow-[8px_8px_0_rgba(0,0,0,.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-line p-6 md:p-8">
          <div>
            <div className="kicker">Create questionnaire</div>
            <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight md:text-[32px]">Start with the right base.</h2>
            <p className="mt-2 text-sm text-muted">Universal is recommended for most projects. You can remove what you do not need.</p>
          </div>
          <button className="flex h-10 w-10 shrink-0 items-center justify-center border border-line-strong bg-white text-xl" onClick={onClose}>×</button>
        </div>
        <div className="p-6 md:p-8">
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button onClick={() => setMode('universal')} className={`border p-6 text-left ${mode === 'universal' ? 'border-ink shadow-[4px_4px_0_rgba(2,2,2,.08)]' : 'border-line-strong'} bg-white`}>
              <div className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-wider text-red">Recommended</div>
              <strong className="block text-[17px]">Use Universal</strong>
              <p className="mt-1 text-[13px] text-muted">Clone the default Appsrow discovery structure.</p>
            </button>
            <button onClick={() => setMode('blank')} className={`border p-6 text-left ${mode === 'blank' ? 'border-ink shadow-[4px_4px_0_rgba(2,2,2,.08)]' : 'border-line-strong'} bg-white`}>
              <div className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-wider text-red">Focused</div>
              <strong className="block text-[17px]">Start blank</strong>
              <p className="mt-1 text-[13px] text-muted">Create only the sections and questions you need.</p>
            </button>
          </div>
          <div className="mb-4"><label className="mb-2 block text-[13px] font-semibold">Questionnaire name</label><input className="input" placeholder="Client Website Discovery" value={name} onChange={(e) => handleNameChange(e.target.value)} /></div>
          <div className="mb-4"><label className="mb-2 block text-[13px] font-semibold">Custom slug</label><input className="input mono" placeholder="client-website" value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value) }} /><p className="mt-1 text-xs text-muted">Lowercase letters, numbers and hyphens only.</p></div>
          <div className="mb-4"><label className="mb-2 block text-[13px] font-semibold">Purpose</label><textarea className="textarea" placeholder="Collect scope, design readiness and project requirements before discovery." value={purpose} onChange={(e) => setPurpose(e.target.value)} /></div>
          {error && <div className="mb-4 border-l-[3px] border-red bg-[#FFF7F7] p-4 text-sm">{error}</div>}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-canvas p-4 md:p-6">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-red" onClick={handleCreate}>Create questionnaire</button>
        </div>
      </div>
    </div>
  )
}

// --- Question Inspector ---

function QuestionInspector({
  question,
  allQuestions,
  onSave,
  onDelete,
}: {
  question: QuestionData
  allQuestions: QuestionData[]
  onSave: (q: QuestionData) => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState(question)
  const [logicEnabled, setLogicEnabled] = useState(!!question.logic?.showWhen?.conditions?.length)

  const questionKey = JSON.stringify(question)
  useEffect(() => {
    setDraft(question)
    setLogicEnabled(!!question.logic?.showWhen?.conditions?.length)
  }, [questionKey])

  const others = allQuestions.filter((q) => q.id !== draft.id)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 border-b border-line pb-6 md:mb-8 md:flex-row md:items-start md:justify-between md:gap-6">
        <div>
          <div className="kicker mb-2">{draft.id} · {TYPE_LABELS[draft.type]}</div>
          <h2 className="text-[22px] font-semibold leading-tight tracking-tight md:text-[28px]">Edit question</h2>
          <p className="text-sm text-muted">Everything for this question is in one place.</p>
        </div>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
      </div>

      <div className="mb-6">
        <h3 className="mb-4 text-lg font-semibold">Question</h3>
        <div className="mb-6">
          <label className="mb-2 block text-[13px] font-semibold">Question</label>
          <input className="input" value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
        </div>
        <div className="mb-6">
          <label className="mb-2 block text-[13px] font-semibold">Help text</label>
          <textarea className="textarea" value={draft.helpText} onChange={(e) => setDraft({ ...draft, helpText: e.target.value })} />
        </div>
      </div>

      <div className="mb-6 border-t border-line pt-6">
        <h3 className="mb-4 text-lg font-semibold">Answer</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-[13px] font-semibold">Response type</label>
            <select className="v6-select" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as QuestionData['type'] })}>
              {SUPPORTED_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-[13px] font-semibold">Placeholder</label>
            <input className="input" value={draft.placeholder} onChange={(e) => setDraft({ ...draft, placeholder: e.target.value })} />
          </div>
        </div>

        {isChoiceType(draft.type) && (
          <div className="mt-4">
            <label className="mb-2 block text-[13px] font-semibold">Options</label>
            <textarea className="textarea" placeholder="One option per line" value={draft.options.join('\n')} onChange={(e) => setDraft({ ...draft, options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} />
            <p className="mt-1 text-xs text-muted">One option per line.</p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-line py-4">
          <div><strong className="text-[13px]">Required</strong><p className="text-xs text-muted">Client must answer before continuing.</p></div>
          <button className={`switch ${draft.required ? 'on' : ''}`} onClick={() => setDraft({ ...draft, required: !draft.required })} />
        </div>
        <div className="flex items-center justify-between border-t border-line py-4">
          <div><strong className="text-[13px]">Active</strong><p className="text-xs text-muted">Keep the question in the draft without deleting it.</p></div>
          <button className={`switch ${draft.active ? 'on' : ''}`} onClick={() => setDraft({ ...draft, active: !draft.active })} />
        </div>
      </div>

      <div className="mb-6 border-t border-line pt-6">
        <h3 className="mb-4 text-lg font-semibold">Rules</h3>
        <div className="mb-2 text-[13px] font-semibold">Visibility</div>
        <div className="flex flex-wrap border border-line-strong" style={{ width: 'max-content', maxWidth: '100%' }}>
          <button className={`border-0 px-4 py-2 text-[13px] ${!logicEnabled ? 'bg-ink text-white' : 'bg-white'}`} onClick={() => { setLogicEnabled(false); setDraft({ ...draft, logic: undefined }) }}>Always show</button>
          <button className={`border-l border-line-strong px-4 py-2 text-[13px] ${logicEnabled ? 'bg-ink text-white' : 'bg-white'}`} onClick={() => { setLogicEnabled(true); if (!draft.logic) setDraft({ ...draft, logic: { showWhen: { match: 'any', conditions: [{ questionId: others[0]?.id || '', operator: 'equals', value: '' }] } } }) }}>Conditional</button>
        </div>

        {logicEnabled && draft.logic && (
          <div className="mt-4 border-l-[3px] border-red bg-canvas p-4">
            <div className="mb-4">
              <label className="mb-2 block text-[13px] font-semibold">Match</label>
              <select className="v6-select" value={draft.logic.showWhen.match} onChange={(e) => setDraft({ ...draft, logic: { showWhen: { ...draft.logic!.showWhen, match: e.target.value as 'any' | 'all' } } })}>
                <option value="all">All conditions</option>
                <option value="any">Any condition</option>
              </select>
            </div>
            {draft.logic.showWhen.conditions.map((c, i) => (
              <div key={i} className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-[1.2fr_.8fr_1fr_40px]">
                <select className="v6-select" value={c.questionId} onChange={(e) => {
                  const conds = [...draft.logic!.showWhen.conditions]
                  conds[i] = { ...conds[i], questionId: e.target.value }
                  setDraft({ ...draft, logic: { showWhen: { ...draft.logic!.showWhen, conditions: conds } } })
                }}>
                  {others.map((q) => <option key={q.id} value={q.id}>{q.question}</option>)}
                </select>
                <select className="v6-select" value={c.operator} onChange={(e) => {
                  const conds = [...draft.logic!.showWhen.conditions]
                  conds[i] = { ...conds[i], operator: e.target.value as ShowOperator }
                  setDraft({ ...draft, logic: { showWhen: { ...draft.logic!.showWhen, conditions: conds } } })
                }}>
                  {OPERATORS.map((o) => <option key={o} value={o}>{o.replaceAll('_', ' ')}</option>)}
                </select>
                <input className="input" value={c.value || ''} placeholder="Value" onChange={(e) => {
                  const conds = [...draft.logic!.showWhen.conditions]
                  conds[i] = { ...conds[i], value: e.target.value }
                  setDraft({ ...draft, logic: { showWhen: { ...draft.logic!.showWhen, conditions: conds } } })
                }} />
                <button className="btn btn-ghost btn-icon" onClick={() => {
                  const conds = draft.logic!.showWhen.conditions.filter((_, j) => j !== i)
                  setDraft({ ...draft, logic: conds.length ? { showWhen: { ...draft.logic!.showWhen, conditions: conds } } : undefined })
                  if (!conds.length) setLogicEnabled(false)
                }}>×</button>
              </div>
            ))}
            <button className="btn btn-text mt-2" onClick={() => {
              setDraft({ ...draft, logic: { showWhen: { ...draft.logic!.showWhen, conditions: [...draft.logic!.showWhen.conditions, { questionId: others[0]?.id || '', operator: 'equals', value: '' }] } } })
            }}>+ Add condition</button>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mt-8 flex items-center justify-between border-t border-line bg-white/95 pt-6">
        <span className="text-xs text-muted">Ready to save</span>
        <button className="btn btn-red" onClick={() => onSave(draft)}>Save changes</button>
      </div>
    </div>
  )
}

// --- Design Tab ---

function DesignTab({ questionnaire, onUpdate }: { questionnaire: QuestionnaireData; onUpdate: (theme: Record<string, unknown>) => void }) {
  const [theme, setTheme] = useState(questionnaire.theme)
  useEffect(() => setTheme(questionnaire.theme), [questionnaire.id])

  const themes: [ThemePreset, string, string][] = [
    ['light', 'Light', 'Clean, direct and universal.'],
    ['dark', 'Dark', 'Immersive near-black experience.'],
    ['editorial', 'Editorial', 'Asymmetric and typographic.'],
  ]

  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <h2 className="text-[30px] font-semibold leading-tight tracking-tight">Client appearance</h2>
        <p className="mb-8 text-sm text-muted">Choose a strong base, then make a few meaningful adjustments.</p>
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {themes.map(([id, name, desc]) => (
            <button key={id} onClick={() => setTheme({ ...theme, preset: id })} className={`border p-4 text-left ${theme.preset === id ? 'border-ink shadow-[4px_4px_0_rgba(2,2,2,.08)]' : 'border-line-strong'} bg-white`}>
              <div className={`mb-4 flex h-40 flex-col justify-between border p-4 ${id === 'dark' ? 'border-ink bg-ink text-white' : id === 'editorial' ? 'border-line bg-surface-muted' : 'border-line'}`}>
                <div className="h-1.5 w-14 bg-red" />
                <div className="grid gap-2">
                  <span className="block h-2 w-[86%] opacity-80" style={{ background: 'currentColor' }} />
                  <span className="block h-1 w-[68%] opacity-20" style={{ background: 'currentColor' }} />
                  <span className="block h-1 w-[82%] opacity-20" style={{ background: 'currentColor' }} />
                </div>
              </div>
              <strong className="block">{name}</strong>
              <small className="text-muted">{desc}</small>
            </button>
          ))}
        </div>
      </div>
      <aside className="border border-line-strong bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Customize</h3>
        <div className="mb-6"><label className="mb-2 block text-[13px] font-semibold">Heading scale</label><select className="v6-select" value={theme.heading} onChange={(e) => setTheme({ ...theme, heading: e.target.value as 'large' | 'compact' })}><option value="large">Large</option><option value="compact">Compact</option></select></div>
        <div className="mb-6"><label className="mb-2 block text-[13px] font-semibold">Content width</label><select className="v6-select" value={theme.width} onChange={(e) => setTheme({ ...theme, width: e.target.value as 'wide' | 'focused' })}><option value="wide">Wide</option><option value="focused">Focused</option></select></div>
        <div className="mb-6"><label className="mb-2 block text-[13px] font-semibold">Progress style</label><select className="v6-select" value={theme.progress} onChange={(e) => setTheme({ ...theme, progress: e.target.value as 'fraction' | 'minimal' })}><option value="fraction">Question fraction</option><option value="minimal">Minimal label</option></select></div>
        <div className="flex items-center justify-between py-4">
          <div><strong className="text-[13px]">Show Appsrow logo</strong><p className="text-xs text-muted">Keep branding visible on client forms.</p></div>
          <button className={`switch ${theme.showLogo ? 'on' : ''}`} onClick={() => setTheme({ ...theme, showLogo: !theme.showLogo })} />
        </div>
        <div className="mt-6 flex gap-2">
          <button className="btn btn-red" onClick={() => onUpdate(theme)}>Save design</button>
        </div>
      </aside>
    </div>
  )
}

// --- Questionnaire Settings ---

function QuestionnaireSettingsTab({ questionnaire, onSave }: {
  questionnaire: QuestionnaireData
  onSave: (input: Record<string, unknown>) => void
}) {
  const [name, setName] = useState(questionnaire.name)
  const [slug, setSlug] = useState(questionnaire.slug.replace(/^q\//, ''))
  const [purpose, setPurpose] = useState(questionnaire.purpose)
  const [status, setStatus] = useState(questionnaire.status)

  useEffect(() => {
    setName(questionnaire.name)
    setSlug(questionnaire.slug.replace(/^q\//, ''))
    setPurpose(questionnaire.purpose)
    setStatus(questionnaire.status)
  }, [questionnaire.id])

  return (
    <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[220px_minmax(0,720px)] md:gap-12">
      <div className="hidden border-t border-ink md:block">
        <div className="border-b border-line py-4 font-semibold text-red">General</div>
        <div className="border-b border-line py-4 text-muted">Sharing</div>
      </div>
      <div className="border-t border-ink pt-6">
        <h2 className="text-[24px] font-semibold leading-tight tracking-tight md:text-[30px]">Questionnaire settings</h2>
        <p className="mb-8 text-sm text-muted">Only the essentials for this questionnaire.</p>
        <div className="mb-6"><label className="mb-2 block text-[13px] font-semibold">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="mb-6"><label className="mb-2 block text-[13px] font-semibold">Slug</label><input className="input mono" value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
        <div className="mb-6"><label className="mb-2 block text-[13px] font-semibold">Purpose</label><textarea className="textarea" value={purpose} onChange={(e) => setPurpose(e.target.value)} /></div>
        <div className="mb-6"><label className="mb-2 block text-[13px] font-semibold">Status</label><select className="v6-select" value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'live')}><option value="draft">Draft</option><option value="live">Live</option></select></div>
        <button className="btn btn-red" onClick={() => onSave({ name, slug: questionnaire.isDefault ? slug : 'q/' + slug, purpose, status })}>Save settings</button>
      </div>
    </div>
  )
}

// --- Response Detail ---

function ResponseDetailPage({ response, questionnaireName, onBack, onToggleStatus, onCopyEmail }: {
  response: ResponseData; questionnaireName: string; onBack: () => void; onToggleStatus: () => void; onCopyEmail: () => void
}) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-[13px] text-muted">
        <button onClick={onBack} className="hover:text-red">Responses</button>
        <span>/</span><span>{response.name}</span>
      </div>
      <div className="flex flex-col gap-4 border-b border-ink pb-6 md:flex-row md:items-end md:justify-between md:gap-8">
        <div>
          <div className="kicker mb-2">Submission · {response.submittedAt}</div>
          <h1 className="text-[28px] font-semibold leading-none tracking-tight md:text-[40px]">{response.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-muted md:gap-4">
            <span>{response.company}</span><span>{response.projectType}</span><span>{questionnaireName}</span>
            <span className={`badge ${response.status === 'new' ? 'red' : ''}`}>{response.status}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={onCopyEmail}>Copy email</button>
          <button className="btn btn-red btn-sm" onClick={onToggleStatus}>{response.status === 'reviewed' ? 'Mark new' : 'Mark reviewed'}</button>
        </div>
      </div>

      {Object.keys(response.snapshot).length > 0 && (
        <div className="my-6 grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 md:my-8 lg:grid-cols-4">
          {Object.entries(response.snapshot).map(([k, v]) => (
            <div key={k} className="min-h-[100px] border-b border-r border-line p-4">
              <label className="mono text-[10px] font-semibold uppercase tracking-wider text-muted">{k}</label>
              <strong className="mt-3 block text-base">{v}</strong>
            </div>
          ))}
        </div>
      )}

      {response.clarity > 0 && (
        <div className="mb-6 grid grid-cols-1 border border-ink md:mb-8 md:grid-cols-[180px_1fr]">
          <div className="bg-ink p-6 text-white">
            <strong className="block text-5xl leading-none">{response.clarity}%</strong>
            <span className="mono mt-2 block text-[10px] font-semibold uppercase tracking-wider text-[#A8A8A4]">Project clarity</span>
          </div>
          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 md:gap-8">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Ready</h3>
              {response.ready.map((x) => <p key={x} className="my-1 text-[13px] text-muted">✓ {x}</p>)}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Clarify on call</h3>
              {response.clarify.map((x) => <p key={x} className="my-1 text-[13px] text-muted">• {x}</p>)}
            </div>
          </div>
        </div>
      )}

      <h2 className="mb-4 text-[24px] font-semibold tracking-tight md:text-[30px]">Full responses</h2>
      <p className="mb-4 text-sm text-muted">Original answers, in questionnaire order.</p>
      <div className="border-t border-ink">
        {response.answers.map(([q, a]) => (
          <div key={q} className="grid grid-cols-1 gap-2 border-b border-line py-4 md:grid-cols-[300px_1fr] md:gap-8 md:py-6">
            <label className="text-[13px] text-muted">{q}</label>
            <p className="text-sm">{a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Workspace Settings ---

function WorkspaceSettingsPage({ workspace, onSave }: { workspace: WorkspaceSettings; onSave: (input: WorkspaceSettings) => void }) {
  const [name, setName] = useState(workspace.name)
  const [domain, setDomain] = useState(workspace.domain)
  const [theme, setTheme] = useState(workspace.defaultTheme)
  const [settingsTab, setSettingsTab] = useState<'workspace' | 'developer'>('workspace')
  const [jsonInput, setJsonInput] = useState('')
  const [jsonStatus, setJsonStatus] = useState('')

  async function handleJsonImport() {
    if (!jsonInput.trim()) { setJsonStatus('Paste a JSON payload first.'); return }
    try {
      const parsed = JSON.parse(jsonInput)
      if (!parsed || typeof parsed !== 'object') { setJsonStatus('Invalid JSON object.'); return }
      const res = await fetch('/api/adl/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed, mode: 'blank' }),
      })
      const data = await res.json() as { questionnaire?: { id: string; name: string }; error?: string }
      if (!res.ok) { setJsonStatus(data.error || 'Import failed.'); return }
      setJsonStatus(`Imported "${data.questionnaire?.name}" successfully.`)
      setJsonInput('')
    } catch {
      setJsonStatus('Invalid JSON — check syntax and try again.')
    }
  }

  return (
    <div>
      <div className="mb-8 md:mb-12">
        <div className="kicker">Workspace</div>
        <h1 className="mt-2 text-[clamp(32px,4.6vw,56px)] font-semibold leading-none tracking-[-0.045em]">Settings</h1>
        <p className="mt-4 max-w-[760px] text-base leading-relaxed text-muted">Workspace defaults and technical import tools, kept separate from day-to-day questionnaire editing.</p>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_minmax(0,720px)] md:gap-12">
        <div className="flex overflow-auto border-b border-line md:block md:border-b-0 md:border-t md:border-ink">
          <button onClick={() => setSettingsTab('workspace')} className={`shrink-0 border-b border-line px-3 py-4 text-left md:block md:w-full md:px-0 ${settingsTab === 'workspace' ? 'font-semibold text-red' : 'text-muted'}`}>Workspace</button>
          <button onClick={() => setSettingsTab('developer')} className={`shrink-0 border-b border-line px-3 py-4 text-left md:block md:w-full md:px-0 ${settingsTab === 'developer' ? 'font-semibold text-red' : 'text-muted'}`}>Developer & JSON</button>
        </div>

        {settingsTab === 'workspace' && (
          <div className="border-t border-ink pt-6">
            <h2 className="text-[24px] font-semibold leading-tight tracking-tight md:text-[30px]">Workspace</h2>
            <p className="mb-8 text-sm text-muted">Defaults that apply across Appsrow Discovery.</p>
            <div className="mb-6"><label className="mb-2 block text-[13px] font-semibold">Workspace name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="mb-6"><label className="mb-2 block text-[13px] font-semibold">Public domain</label><input className="input mono" value={domain} onChange={(e) => setDomain(e.target.value)} /></div>
            <div className="mb-6"><label className="mb-2 block text-[13px] font-semibold">Default client theme</label><select className="v6-select" value={theme} onChange={(e) => setTheme(e.target.value as ThemePreset)}><option value="light">Light</option><option value="dark">Dark</option><option value="editorial">Editorial</option></select></div>
            <button className="btn btn-red" onClick={() => onSave({ name, domain, defaultTheme: theme })}>Save workspace</button>
          </div>
        )}

        {settingsTab === 'developer' && (
          <div className="border-t border-ink pt-6">
            <h2 className="text-[24px] font-semibold leading-tight tracking-tight md:text-[30px]">Developer & JSON</h2>
            <p className="mb-8 text-sm text-muted">Import questionnaires from a JSON payload or use these tools for programmatic access.</p>

            <div className="mb-8">
              <h3 className="mb-4 text-lg font-semibold">Import questionnaire from JSON</h3>
              <p className="mb-4 text-[13px] text-muted">
                Paste a JSON object with <code className="mono text-ink">name</code>, <code className="mono text-ink">slug</code>, and <code className="mono text-ink">purpose</code> fields. The questionnaire will be created as a blank draft.
              </p>
              <textarea
                className="textarea mono"
                style={{ minHeight: 200, fontSize: 13 }}
                placeholder={'{\n  "name": "Client Onboarding",\n  "slug": "client-onboarding",\n  "purpose": "Collect onboarding details"\n}'}
                value={jsonInput}
                onChange={(e) => { setJsonInput(e.target.value); setJsonStatus('') }}
              />
              {jsonStatus && (
                <div className={`mt-2 border-l-[3px] p-3 text-sm ${jsonStatus.includes('success') ? 'border-green-600 bg-green-50 text-green-800' : 'border-red bg-[#FFF7F7] text-red'}`}>
                  {jsonStatus}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <button className="btn btn-red" onClick={handleJsonImport}>Import JSON</button>
                <button className="btn btn-ghost" onClick={() => { setJsonInput(''); setJsonStatus('') }}>Clear</button>
              </div>
            </div>

            <div className="border-t border-line pt-8">
              <h3 className="mb-4 text-lg font-semibold">API endpoints</h3>
              <div className="grid gap-4">
                {[
                  ['GET', '/api/adl/questionnaires', 'List all questionnaires'],
                  ['POST', '/api/adl/questionnaires', 'Create a questionnaire'],
                  ['GET', '/api/adl/questionnaires/:id', 'Get a single questionnaire with sections and questions'],
                  ['PUT', '/api/adl/questionnaires/:id', 'Update questionnaire settings, theme, or status'],
                  ['DELETE', '/api/adl/questionnaires/:id', 'Delete a non-default questionnaire'],
                  ['POST', '/api/adl/questionnaires/:id/sections', 'Add a section'],
                  ['POST', '/api/adl/questionnaires/:id/questions', 'Add a question to a section'],
                  ['PUT', '/api/adl/questions/:id', 'Update a question'],
                  ['DELETE', '/api/adl/questions/:id', 'Delete a question'],
                  ['GET', '/api/adl/workspace', 'Get workspace settings'],
                  ['PUT', '/api/adl/workspace', 'Update workspace settings'],
                ].map(([method, path, desc]) => (
                  <div key={path + method} className="flex items-start gap-3 border-b border-line pb-3">
                    <span className={`mono shrink-0 text-[11px] font-semibold ${method === 'GET' ? 'text-blue-600' : method === 'POST' ? 'text-green-600' : method === 'PUT' ? 'text-amber-600' : 'text-red'}`}>{method}</span>
                    <div>
                      <code className="mono text-[13px] text-ink">{path}</code>
                      <p className="mt-0.5 text-[12px] text-muted">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
