/**
 * Client-side (localStorage) session management.
 * Replaces the server-side Prisma/API layer for GitHub Pages static hosting.
 */

import type {
  Question, SessionMode, SessionFilters,
  GradeResult, DashboardData, AnswerRecord,
} from '@/types'
import { filterQuestions, shuffleArray, QUESTION_MAP } from '@/data/questions'
import { gradeAnswer } from '@/lib/grading'

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
  questions: Question[]
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

export function createSession(params: {
  subject: string
  mode: SessionMode
  filters: SessionFilters
  count: number
}): StoredSession | { error: string } {
  const { subject, mode, filters, count } = params
  const pool = filterQuestions(subject, filters)
  if (pool.length === 0) return { error: 'No questions match the selected filters.' }

  const selected = shuffleArray(
    mode === 'flashcard' ? [...pool] : [...pool]
  ).slice(0, mode === 'flashcard' ? pool.length : count)

  const session: StoredSession = {
    id: uid(),
    subject,
    mode,
    filters,
    questionIds: selected.map(q => q.id),
    questions: selected,
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

export function submitAnswer(params: {
  sessionId: string
  questionId: string
  userAnswer: string
  confidence?: string
  timeMs?: number
}): { gradeResult: GradeResult; answer: StoredAnswer } | { error: string } {
  const session = readSession(params.sessionId)
  if (!session) return { error: 'Session not found.' }

  const question = QUESTION_MAP[params.questionId]
  if (!question) return { error: 'Question not found.' }

  const gradeResult = gradeAnswer(question, params.userAnswer)

  const answer: StoredAnswer = {
    id: uid(),
    sessionId: params.sessionId,
    questionId: params.questionId,
    subject: question.subject,
    topic: question.topic,
    difficulty: question.difficulty,
    qType: question.questionType,
    userAnswer: params.userAnswer,
    correct: gradeResult.correct,
    score: gradeResult.score,
    maxScore: gradeResult.maxScore,
    confidence: params.confidence ?? null,
    timeMs: params.timeMs ?? null,
    gradingType: gradeResult.gradingType,
    gradeResult,
    createdAt: new Date().toISOString(),
  }

  const nextIdx = Math.min(session.currentIdx + 1, session.questionIds.length)
  session.answers.push(answer)
  session.currentIdx = nextIdx
  session.status = nextIdx >= session.questionIds.length ? 'completed' : 'active'
  writeSession(session)

  return { gradeResult, answer }
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

  // Mistakes = questions answered incorrectly at least once, never corrected
  const mistakeCount = Object.values(
    allAnswers.reduce((acc, a) => {
      if (!acc[a.questionId]) acc[a.questionId] = { ever_correct: false }
      if (a.correct === true) acc[a.questionId]!.ever_correct = true
      return acc
    }, {} as Record<string, { ever_correct: boolean }>)
  ).filter(v => !v.ever_correct).length

  // Recent answers (as AnswerRecord for compatibility)
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
