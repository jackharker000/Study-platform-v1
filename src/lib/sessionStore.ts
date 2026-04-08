/**
 * Client-side (localStorage) session management.
 * Sessions now use CloudQuestion (fetched from /api/questions).
 * Legacy Question support is retained for local-dev fallback.
 */

import type {
  CloudQuestion, SessionMode, SessionFilters,
  GradeResult, DashboardData, AnswerRecord,
} from '@/types'

// ─── Stored shapes ────────────────────────────────────────────────

export interface StoredAnswer {
  id: string
  sessionId: string
  questionId: string
  subject: string
  topic: string
  difficulty: string
  qType: string
  userAnswer: string
  correct: boolean | null
  score: number | null
  maxScore: number | null
  confidence: string | null
  timeMs: number | null
  gradingType: string
  gradeResult: GradeResult
  createdAt: string
}

export interface StoredSession {
  id: string
  subject: string | null
  mode: SessionMode
  filters: SessionFilters
  questionIds: string[]
  questions: CloudQuestion[]
  currentIdx: number
  status: 'active' | 'completed'
  answers: StoredAnswer[]
  createdAt: string
}

// ─── Storage helpers ──────────────────────────────────────────────

const INDEX_KEY = 'rp-sessions'

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function sessionKey(id: string) { return `rp-session-${id}` }

function readIndex(): string[] {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') } catch { return [] }
}

function writeIndex(ids: string[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(ids))
}

function readSession(id: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(id))
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch { return null }
}

function writeSession(session: StoredSession) {
  localStorage.setItem(sessionKey(session.id), JSON.stringify(session))
}

// ─── Public API ───────────────────────────────────────────────────

export async function createSession(params: {
  subject: string
  mode: SessionMode
  filters: SessionFilters
  count: number
}): Promise<StoredSession | { error: string }> {
  const { subject, mode, filters, count } = params

  // Build query params for /api/questions
  const qs = new URLSearchParams({ subjectId: subject, shuffle: 'true' })
  if (filters.paper && filters.paper !== 'all') qs.set('paper', filters.paper)
  if (filters.topic && filters.topic !== 'all') qs.set('topic', filters.topic)
  if (filters.year && filters.year !== 'all') qs.set('year', filters.year)
  if (filters.questionType && filters.questionType !== 'all') {
    qs.set('isMcq', filters.questionType === 'mcq' ? '1' : '0')
  }
  // For flashcard mode fetch up to 100; otherwise use requested count
  qs.set('limit', String(mode === 'flashcard' ? 100 : count))

  let questions: CloudQuestion[]
  try {
    const res = await fetch(`/api/questions?${qs.toString()}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    questions = await res.json() as CloudQuestion[]
  } catch (err) {
    console.error('[createSession] fetch failed', err)
    return { error: 'Failed to load questions. Please check your connection.' }
  }

  if (!questions.length) return { error: 'No questions match the selected filters.' }

  const session: StoredSession = {
    id: uid(),
    subject,
    mode,
    filters,
    questionIds: questions.map(q => q.id),
    questions,
    currentIdx: 0,
    status: 'active',
    answers: [],
    createdAt: new Date().toISOString(),
  }

  writeSession(session)
  writeIndex([session.id, ...readIndex()])
  return session
}

export function getSession(id: string): StoredSession | null {
  return readSession(id)
}

/**
 * Record a pre-graded answer (grading happens in the quiz page via /api/grade).
 */
export function recordAnswer(params: {
  sessionId: string
  questionId: string
  subject: string
  topic: string
  userAnswer: string
  gradeResult: GradeResult
  confidence?: string
  timeMs?: number
}): { answer: StoredAnswer } | { error: string } {
  const session = readSession(params.sessionId)
  if (!session) return { error: 'Session not found.' }

  const answer: StoredAnswer = {
    id: uid(),
    sessionId: params.sessionId,
    questionId: params.questionId,
    subject: params.subject,
    topic: params.topic,
    difficulty: 'unknown',
    qType: 'cloud',
    userAnswer: params.userAnswer,
    correct: params.gradeResult.correct,
    score: params.gradeResult.score,
    maxScore: params.gradeResult.maxScore,
    confidence: params.confidence ?? null,
    timeMs: params.timeMs ?? null,
    gradingType: params.gradeResult.gradingType,
    gradeResult: params.gradeResult,
    createdAt: new Date().toISOString(),
  }

  const nextIdx = Math.min(session.currentIdx + 1, session.questionIds.length)
  session.answers.push(answer)
  session.currentIdx = nextIdx
  session.status = nextIdx >= session.questionIds.length ? 'completed' : 'active'
  writeSession(session)

  return { answer }
}

export function getAllSessions(): StoredSession[] {
  return readIndex()
    .map(id => readSession(id))
    .filter((s): s is StoredSession => s !== null)
}

export function clearAllData() {
  const ids = readIndex()
  ids.forEach(id => localStorage.removeItem(sessionKey(id)))
  localStorage.removeItem(INDEX_KEY)
}

// ─── Dashboard computation ────────────────────────────────────────

export function computeDashboard(): DashboardData {
  const sessions = getAllSessions()
  const allAnswers: StoredAnswer[] = sessions.flatMap(s => s.answers)

  const total = allAnswers.length
  const correct = allAnswers.filter(a => a.correct === true).length
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0

  // By subject
  const subjectMap: Record<string, { correct: number; total: number }> = {}
  allAnswers.forEach(a => {
    subjectMap[a.subject] ??= { correct: 0, total: 0 }
    subjectMap[a.subject]!.total++
    if (a.correct === true) subjectMap[a.subject]!.correct++
  })
  const bySubject = Object.entries(subjectMap).map(([subjectId, s]) => ({
    subjectId,
    correct: s.correct,
    total: s.total,
    pct: Math.round((s.correct / s.total) * 100),
  }))

  // By topic
  const topicMap: Record<string, { correct: number; total: number }> = {}
  allAnswers.forEach(a => {
    topicMap[a.topic] ??= { correct: 0, total: 0 }
    topicMap[a.topic]!.total++
    if (a.correct === true) topicMap[a.topic]!.correct++
  })
  const byTopic = Object.entries(topicMap).map(([topic, s]) => ({
    topic,
    correct: s.correct,
    total: s.total,
    pct: Math.round((s.correct / s.total) * 100),
  }))
  const weakTopics = byTopic
    .filter(t => t.total >= 2)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 6)

  // Mistakes = questions never answered correctly
  const mistakeCount = Object.values(
    allAnswers.reduce((acc, a) => {
      if (!acc[a.questionId]) acc[a.questionId] = { ever_correct: false }
      if (a.correct === true) acc[a.questionId]!.ever_correct = true
      return acc
    }, {} as Record<string, { ever_correct: boolean }>)
  ).filter(v => !v.ever_correct).length

  // Recent answers
  const recentAnswers: AnswerRecord[] = allAnswers
    .slice(-20)
    .reverse()
    .map(a => ({
      id: a.id,
      sessionId: a.sessionId,
      questionId: a.questionId,
      subject: a.subject,
      topic: a.topic,
      difficulty: a.difficulty,
      qType: a.qType,
      userAnswer: a.userAnswer,
      correct: a.correct,
      score: a.score,
      maxScore: a.maxScore,
      confidence: a.confidence,
      timeMs: a.timeMs,
      gradingType: a.gradingType as 'auto' | 'ai_rubric' | 'ungraded',
      createdAt: a.createdAt,
    }))

  return { overall: { correct, total, pct }, bySubject, byTopic, weakTopics, recentAnswers, mistakeCount }
}
