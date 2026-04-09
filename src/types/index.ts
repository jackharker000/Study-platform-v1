// ─── Cloud Question (from Turso + ngrok PDF server) ────────────────

export interface CloudQuestion {
  id: string           // e.g. "IGCSE__Biology-0610__0610__2020__s20__41__Q3"
  level: string        // "IGCSE" | "AS_Level" | "A2_Level"
  subject: string      // "Biology-0610"
  syllabusCode: string // "0610"
  year: number         // 2020
  session: string      // "s" | "w" | "m"
  paper: string        // "41"
  questionNum: string  // "3"
  isMcq: boolean
  imageUrl: string | null  // PDF URL (served via ngrok → local PC)
  msText: string | null    // mark scheme text
  msMarks: number | null   // total available marks
  topics: string[]
  skills: string[]
}

// ─── Question Types ───────────────────────────────────────────────

export type QuestionType = 'mcq' | 'short-answer' | 'calculation' | 'essay'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type SourceType = 'original' | 'uploaded_file' | 'manual' | 'generated'
export type GradingType = 'auto' | 'ai_rubric' | 'ungraded'

export interface QuestionSource {
  type: SourceType
  fileId?: string
  fileName?: string
  page?: number
  questionLabel?: string
  verified?: boolean
}

export interface Question {
  id: string
  subject: string
  level: string
  syllabus: string
  paper: string
  topic: string
  subtopic?: string
  syllabusRef?: string
  difficulty: Difficulty
  difficultyScore: number
  questionType: QuestionType
  marks: number
  skillsTested: string[]
  tags: string[]
  examFrequency: 'high' | 'medium' | 'low'
  prompt: string
  options?: string[] | null  // MCQ only
  correctAnswer: number | string | null
  explanation: string
  commonMistakes?: string[]
  teachingSteps?: string[]
  aiMarkable: boolean
  markScheme?: string[] | null | undefined
  source?: QuestionSource
}

// ─── Subject Types ────────────────────────────────────────────────

export interface Subject {
  id: string
  name: string
  level: string
  syllabus: string
  color: string
  icon: string
}

// ─── Session Types ────────────────────────────────────────────────

export type SessionMode = 'practice' | 'exam' | 'weakness' | 'mistakes' | 'tutor' | 'flashcard'
export type SessionStatus = 'active' | 'completed'

export interface SessionFilters {
  paper: string
  topic: string
  difficulty: string
  questionType: string
  year?: string  // cloud questions filter
}

export interface SessionSummary {
  id: string
  subject: string | null
  mode: SessionMode
  filters: SessionFilters
  questionIds: string[]
  currentIdx: number
  status: SessionStatus
  createdAt: string
  answers: AnswerRecord[]
}

// ─── Answer / Grading Types ───────────────────────────────────────

export interface AnswerRecord {
  id: string
  sessionId: string
  questionId: string
  subject: string
  topic: string
  difficulty: string
  qType: string
  userAnswer: string
  correct?: boolean | null
  score?: number | null
  maxScore?: number | null
  confidence?: string | null
  timeMs?: number | null
  gradingType: GradingType
  aiFeedback?: string | null
  createdAt: string
}

export interface GradeResult {
  status: 'correct' | 'incorrect' | 'partial' | 'ungraded'
  correct: boolean | null
  score: number
  maxScore: number
  gradingType: GradingType
  criterionScores?: Record<string, number>
  strengths?: string[]
  missingPoints?: string[]
  feedback?: string
  nextTarget?: string
  explanation?: string
}

// ─── API Payloads ─────────────────────────────────────────────────

export interface StartSessionPayload {
  subject?: string
  mode: SessionMode
  filters: SessionFilters
  count: number
}

export interface SubmitAnswerPayload {
  sessionId: string
  questionId: string
  userAnswer: string
  confidence?: string
  timeMs?: number
}

export interface GradePayload {
  questionId: string
  userAnswer: string
  useAI?: boolean
}

export interface SearchQuestionsPayload {
  subject?: string
  topic?: string
  paper?: string
  difficulty?: string
  questionType?: string
  query?: string
  limit?: number
}

// ─── Analytics ───────────────────────────────────────────────────

export interface TopicStat {
  topic: string
  correct: number
  total: number
  pct: number
}

export interface SubjectStat {
  subjectId: string
  correct: number
  total: number
  pct: number
}

export interface DashboardData {
  overall: { correct: number; total: number; pct: number }
  bySubject: SubjectStat[]
  byTopic: TopicStat[]
  weakTopics: TopicStat[]
  recentAnswers: AnswerRecord[]
  mistakeCount: number
}
