'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { SUBJECTS, SUBJECT_MAP } from '@/data/subjects'
import { QUESTIONS, getTopicsForSubject, getPapersForSubject, filterQuestions } from '@/data/questions'
import { Button, SectionLabel, ChipRow, Chip, Select } from '@/components/ui'
import type { SessionMode, SessionFilters } from '@/types'

const MODES: { id: SessionMode; name: string; desc: string }[] = [
  { id: 'practice',  name: 'Practice',   desc: 'Immediate feedback after each answer' },
  { id: 'exam',      name: 'Exam',       desc: 'No feedback until the end' },
  { id: 'weakness',  name: 'Weakness',   desc: 'Prioritise topics you struggle with' },
  { id: 'mistakes',  name: 'Mistakes',   desc: 'Replay questions you got wrong' },
  { id: 'tutor',     name: 'Tutor',      desc: 'Hints and step-by-step guidance' },
  { id: 'flashcard', name: 'Flashcard',  desc: 'Flip-card study mode' },
]

const COUNTS = [5, 10, 15, 20]

export default function SubjectPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const subject = SUBJECT_MAP[id]

  const [mode, setMode] = useState<SessionMode>('practice')
  const [filters, setFilters] = useState<SessionFilters>({
    paper: 'all', topic: 'all', difficulty: 'all', questionType: 'all',
  })
  const [count, setCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!subject) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 16px', textAlign: 'center', color: 'var(--text-dim)' }}>
        Subject not found. <button onClick={() => router.push('/')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Go home</button>
      </div>
    )
  }

  const topics = getTopicsForSubject(id)
  const papers = getPapersForSubject(id)
  const pool = filterQuestions(id, filters)

  async function handleStart() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: id, mode, filters, count }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to start session')
      router.push(`/quiz/${data.sessionId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setLoading(false)
    }
  }

  const pf = (key: keyof SessionFilters, val: string) =>
    setFilters(f => ({ ...f, [key]: val }))

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '20px 16px 100px' }}>
      {/* Header */}
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>← Back</Button>
        <div>
          <h1 style={{ fontFamily: "'Palatino Linotype', Georgia, serif", fontSize: '1.4rem', color: 'var(--text-bright)', fontWeight: 600 }}>
            {subject.icon} {subject.name}
          </h1>
          <div style={{ fontSize: '.75rem', color: 'var(--text-dim)' }}>{subject.level} · {subject.syllabus}</div>
        </div>
      </div>

      {/* Mode */}
      <div className="fade-up stagger-1">
        <SectionLabel>Mode</SectionLabel>
        <ChipRow>
          {MODES.map(m => (
            <Chip key={m.id} label={m.name} active={mode === m.id} onClick={() => setMode(m.id)} />
          ))}
        </ChipRow>
      </div>

      {/* Filters */}
      <div className="fade-up stagger-2">
        <SectionLabel>Filters</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <Select value={filters.topic} onChange={v => pf('topic', v)}>
            <option value="all">All Topics</option>
            {topics.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select value={filters.paper} onChange={v => pf('paper', v)}>
            <option value="all">All Papers</option>
            {papers.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select value={filters.difficulty} onChange={v => pf('difficulty', v)}>
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
          <Select value={filters.questionType} onChange={v => pf('questionType', v)}>
            <option value="all">All Types</option>
            <option value="mcq">MCQ</option>
            <option value="short-answer">Short Answer</option>
            <option value="calculation">Calculation</option>
            <option value="essay">Essay</option>
          </Select>
        </div>
      </div>

      {/* Count */}
      {mode !== 'flashcard' && (
        <div className="fade-up stagger-3">
          <SectionLabel>Question count</SectionLabel>
          <ChipRow>
            {COUNTS.map(n => (
              <Chip key={n} label={String(n)} active={count === n} onClick={() => setCount(n)} />
            ))}
          </ChipRow>
        </div>
      )}

      {/* Start */}
      <div
        className="fade-up stagger-4"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '20px 24px',
        }}
      >
        <div>
          <div style={{ fontSize: '.85rem', color: 'var(--text-bright)', fontWeight: 600 }}>
            {pool.length} questions available
          </div>
          <div style={{ fontSize: '.75rem', color: 'var(--text-dim)' }}>
            {mode === 'flashcard' ? 'Study all cards' : `Up to ${Math.min(pool.length, count)} questions`}
          </div>
        </div>
        <Button onClick={handleStart} disabled={pool.length === 0 || loading}>
          {loading ? 'Starting…' : mode === 'flashcard' ? 'Start Flashcards →' : 'Start Quiz →'}
        </Button>
      </div>

      {error && (
        <div style={{ marginTop: '12px', padding: '12px', background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 'var(--radius)', color: 'var(--red)', fontSize: '.84rem' }}>
          {error}
        </div>
      )}
    </div>
  )
}
