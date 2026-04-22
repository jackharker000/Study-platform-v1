'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, SectionLabel, ChipRow, Chip, Select } from '@/components/ui'
import type { SessionMode, SessionFilters } from '@/types'
import type { SubjectInfo } from '@/app/api/subjects/route'
import { createSession } from '@/lib/sessionStore'

const MODES: { id: SessionMode; name: string; desc: string }[] = [
  { id: 'practice',  name: 'Practice',   desc: 'Immediate feedback after each answer' },
  { id: 'exam',      name: 'Exam',       desc: 'No feedback until the end' },
  { id: 'timed',     name: 'Timed',      desc: 'Score as many marks as possible before time runs out' },
  { id: 'weakness',  name: 'Weakness',   desc: 'Prioritise topics you struggle with' },
  { id: 'mistakes',  name: 'Mistakes',   desc: 'Replay questions you got wrong' },
  { id: 'tutor',     name: 'Tutor',      desc: 'Hints and step-by-step guidance' },
  { id: 'flashcard', name: 'Flashcard',  desc: 'Flip-card study mode' },
]

const TIMED_DURATIONS = [5, 10, 15, 20, 30]

const COUNTS = [5, 10, 15, 20, 50, 100]

function paperLabel(raw: string): string {
  if (/^\d{2}$/.test(raw)) return `Paper ${raw[0]} (Variant ${raw[1]})`
  return `Paper ${raw}`
}
const SESSION_LABELS: Record<string, string> = { s: 'Summer', w: 'Winter', m: 'March' }
void SESSION_LABELS // used by future session filter if added

export default function SubjectPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [subject, setSubject] = useState<SubjectInfo | null>(null)
  const [subjectLoading, setSubjectLoading] = useState(true)

  const [mode, setMode] = useState<SessionMode>('practice')
  const [filters, setFilters] = useState<SessionFilters>({
    paper: 'all', topic: 'all', difficulty: 'all', questionType: 'all', year: 'all',
  })
  const [count, setCount] = useState(10)
  const [timedMinutes, setTimedMinutes] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [papers, setPapers] = useState<string[]>([])
  const [topics, setTopics] = useState<string[]>([])
  const [years, setYears] = useState<string[]>([])
  const [poolCount, setPoolCount] = useState<number | null>(null)

  // Fetch subject info from the subjects API
  useEffect(() => {
    if (!id) return
    fetch('/api/subjects')
      .then(r => r.json())
      .then((data: SubjectInfo[]) => {
        setSubject(data.find(s => s.id === id) ?? null)
        setSubjectLoading(false)
      })
      .catch(() => setSubjectLoading(false))
  }, [id])

  // Load available filter values from the questions API
  useEffect(() => {
    if (!id) return
    const base = `/api/questions?subjectId=${encodeURIComponent(id)}`
    Promise.all([
      fetch(`${base}&distinct=paper`).then(r => r.json()).catch(() => []),
      fetch(`${base}&distinct=topic`).then(r => r.json()).catch(() => []),
      fetch(`${base}&distinct=year`).then(r => r.json()).catch(() => []),
    ]).then(([p, t, y]) => {
      setPapers(Array.isArray(p) ? (p as string[]).filter(Boolean) : [])
      setTopics(Array.isArray(t) ? (t as string[]).filter(Boolean) : [])
      setYears(Array.isArray(y) ? (y as string[]).filter(Boolean) : [])
    })
  }, [id])

  // Update question pool count when filters change
  useEffect(() => {
    if (!id) return
    const qs = new URLSearchParams({ subjectId: id, countOnly: 'true' })
    if (filters.paper !== 'all') qs.set('paper', filters.paper)
    if (filters.topic !== 'all') qs.set('topic', filters.topic)
    if (filters.year && filters.year !== 'all') qs.set('year', filters.year)
    if (filters.questionType !== 'all') qs.set('isMcq', filters.questionType === 'mcq' ? '1' : '0')
    fetch(`/api/questions?${qs}`)
      .then(r => r.json())
      .then((d: { count: number }) => setPoolCount(d.count))
      .catch(() => setPoolCount(null))
  }, [id, filters])

  if (subjectLoading) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '60px 16px', textAlign: 'center', color: 'var(--text-dim)' }}>
        Loading…
      </div>
    )
  }

  if (!subject) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 16px', textAlign: 'center', color: 'var(--text-dim)' }}>
        Subject not found.{' '}
        <button onClick={() => router.push('/')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Go home
        </button>
      </div>
    )
  }

  async function handleStart() {
    setLoading(true)
    setError('')
    const sessionFilters: SessionFilters = mode === 'timed'
      ? { ...filters, timedDurationMs: timedMinutes * 60_000 }
      : filters
    const sessionCount = mode === 'timed' ? 200 : count
    const result = await createSession({ subject: id, mode, filters: sessionFilters, count: sessionCount })
    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }
    router.push(`/quiz?id=${result.id}`)
  }

  const pf = (key: keyof SessionFilters, val: string) =>
    setFilters(f => ({ ...f, [key]: val }))

  const availableCount = poolCount ?? 0
  const sessionCount = mode === 'flashcard' ? availableCount : mode === 'timed' ? Math.min(availableCount, 200) : Math.min(availableCount, count)

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '20px 16px 100px' }}>
      {/* Header */}
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>← Back</Button>
        <div>
          <h1 style={{ fontFamily: "'Palatino Linotype', Georgia, serif", fontSize: '1.4rem', color: 'var(--text-bright)', fontWeight: 600 }}>
            {subject.icon} {subject.name}
          </h1>
          <div style={{ fontSize: '.75rem', color: 'var(--text-dim)' }}>
            {subject.level} · {subject.syllabus} · {subject.count > 0 ? subject.count.toLocaleString() : '…'} questions
          </div>
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
          <Select value={filters.paper} onChange={v => pf('paper', v)}>
            <option value="all">All Papers</option>
            {papers.map(p => <option key={p} value={p}>{paperLabel(p)}</option>)}
          </Select>

          <Select value={filters.year ?? 'all'} onChange={v => pf('year', v)}>
            <option value="all">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </Select>

          <TopicMultiPicker
            topics={topics}
            selected={filters.topic === 'all' ? [] : filters.topic.split(',').filter(Boolean)}
            onChange={sel => pf('topic', sel.length === 0 ? 'all' : sel.join(','))}
          />

          <Select value={filters.questionType} onChange={v => pf('questionType', v)}>
            <option value="all">All Types</option>
            <option value="mcq">MCQ</option>
            <option value="structured">Structured</option>
          </Select>
        </div>
      </div>

      {/* Timed duration */}
      {mode === 'timed' && (
        <div className="fade-up stagger-3">
          <SectionLabel>Duration</SectionLabel>
          <ChipRow>
            {TIMED_DURATIONS.map(n => (
              <Chip key={n} label={`${n} min`} active={timedMinutes === n} onClick={() => setTimedMinutes(n)} />
            ))}
          </ChipRow>
        </div>
      )}

      {/* Count */}
      {mode !== 'flashcard' && mode !== 'timed' && (
        <div className="fade-up stagger-3">
          <SectionLabel>Question count</SectionLabel>
          <ChipRow>
            {COUNTS.map(n => (
              <Chip key={n} label={String(n)} active={count === n} onClick={() => setCount(n)} />
            ))}
            <input
              type="number"
              min={1}
              max={500}
              placeholder="Custom"
              onBlur={e => {
                const n = parseInt(e.target.value, 10)
                if (n >= 1 && n <= 500) setCount(n)
                e.target.value = ''
              }}
              style={{
                width: '72px', padding: '5px 8px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text)',
                fontSize: '.82rem', fontFamily: 'inherit',
              }}
            />
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
            {poolCount === null ? '…' : availableCount.toLocaleString()} questions available
          </div>
          <div style={{ fontSize: '.75rem', color: 'var(--text-dim)' }}>
            {mode === 'flashcard'
              ? `Study all ${availableCount > 0 ? availableCount.toLocaleString() : ''} cards`
              : mode === 'timed'
              ? `${timedMinutes} min · up to ${sessionCount} questions`
              : `Up to ${sessionCount} questions`}
          </div>
        </div>
        <Button onClick={() => void handleStart()} disabled={availableCount === 0 || loading}>
          {loading ? 'Starting…' : mode === 'flashcard' ? 'Start Flashcards →' : mode === 'timed' ? 'Start Timed →' : 'Start Quiz →'}
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

// ─── Multi-topic picker (up to 3) ─────────────────────────────────────────────

function TopicMultiPicker({
  topics, selected, onChange,
}: { topics: string[]; selected: string[]; onChange: (sel: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const MAX = 3

  function toggle(t: string) {
    if (selected.includes(t)) {
      onChange(selected.filter(x => x !== t))
    } else if (selected.length < MAX) {
      onChange([...selected, t])
    }
  }

  const available = topics.filter(t => !selected.includes(t))

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
        {selected.length === 0 && (
          <span style={{ fontSize: '.8rem', color: 'var(--text-dim)', padding: '4px 2px' }}>All Topics</span>
        )}
        {selected.map(t => (
          <span
            key={t}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '3px 8px', background: 'var(--accent-glow)',
              border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)',
              fontSize: '.78rem', color: 'var(--accent)',
            }}>
            {t}
            <button
              onClick={() => toggle(t)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: '0', lineHeight: 1, fontSize: '.75rem' }}>
              ×
            </button>
          </span>
        ))}
        {selected.length < MAX && (
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              padding: '3px 8px', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', fontSize: '.78rem', color: 'var(--text-dim)',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
            + Add topic {selected.length > 0 ? `(${selected.length}/${MAX})` : ''}
          </button>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '4px', zIndex: 50,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '4px',
          maxHeight: '220px', overflowY: 'auto', minWidth: '200px',
          boxShadow: '0 4px 16px rgba(0,0,0,.2)',
        }}>
          {available.length === 0 ? (
            <div style={{ padding: '8px 10px', fontSize: '.8rem', color: 'var(--text-dim)' }}>No more topics</div>
          ) : available.map(t => (
            <button
              key={t}
              onClick={() => { toggle(t); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 10px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '.8rem', color: 'var(--text)',
                borderRadius: 'var(--radius-sm)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-glow)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
