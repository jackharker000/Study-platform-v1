'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { Question } from '@/types'
import { Button, Card, StatCard, BarChart, SectionLabel } from '@/components/ui'

interface AnswerRow {
  questionId: string
  correct: boolean | null
  score: number | null
  maxScore: number | null
  topic: string
  confidence: string | null
}

interface ResultsData {
  session: { mode: string; subject: string | null }
  questions: Question[]
  answers: AnswerRow[]
}

export default function ResultsPage() {
  const router = useRouter()
  const { sessionId } = useParams<{ sessionId: string }>()
  const [data, setData] = useState<ResultsData | null>(null)

  useEffect(() => {
    fetch(`/api/session/${sessionId}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => router.push('/'))
  }, [sessionId, router])

  if (!data) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '60px 16px', textAlign: 'center', color: 'var(--text-dim)' }}>
        Loading results…
      </div>
    )
  }

  const { answers, questions, session } = data
  const total = questions.length
  const answered = answers.length
  const correct = answers.filter(a => a.correct === true).length
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0
  const skipped = total - answered

  // Topic breakdown
  const topicMap: Record<string, { correct: number; total: number }> = {}
  answers.forEach(a => {
    if (!topicMap[a.topic]) topicMap[a.topic] = { correct: 0, total: 0 }
    topicMap[a.topic]!.total++
    if (a.correct === true) topicMap[a.topic]!.correct++
  })
  const topicRows = Object.entries(topicMap).map(([label, s]) => ({
    label,
    pct: Math.round((s.correct / s.total) * 100),
  }))

  const accuracyColor = accuracy >= 70 ? 'var(--green)' : accuracy >= 40 ? 'var(--amber)' : 'var(--red)'

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '20px 16px 100px' }}>
      <div className="fade-up" style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'Palatino Linotype', Georgia, serif", fontSize: '1.85rem', color: 'var(--text-bright)', fontWeight: 600 }}>
          Quiz Complete
        </h1>
        <div style={{ fontSize: '.82rem', color: 'var(--text-dim)', marginTop: '4px' }}>
          {session.mode} mode
        </div>
      </div>

      <div className="fade-up stagger-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <StatCard value={`${accuracy}%`} label="Accuracy" color={accuracyColor} />
        <StatCard value={`${correct}/${answered}`} label="Correct" />
        <StatCard value={skipped} label="Skipped" />
      </div>

      {topicRows.length > 0 && (
        <Card className="fade-up stagger-2">
          <SectionLabel>Performance by Topic</SectionLabel>
          <BarChart rows={topicRows} />
        </Card>
      )}

      {/* Question review (exam mode shows all) */}
      {session.mode === 'exam' && answers.length > 0 && (
        <Card className="fade-up stagger-3">
          <SectionLabel>Question Review</SectionLabel>
          {questions.map((q, i) => {
            const a = answers.find(ans => ans.questionId === q.id)
            if (!a) return null
            return (
              <div key={q.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '.84rem' }}>
                <span style={{ color: a.correct ? 'var(--green)' : 'var(--red)', fontWeight: 600, marginRight: '8px' }}>
                  {a.correct ? '✓' : '✗'}
                </span>
                <span style={{ color: 'var(--text-dim)', marginRight: '6px' }}>{i + 1}.</span>
                {q.prompt.substring(0, 90)}{q.prompt.length > 90 ? '…' : ''}
              </div>
            )
          })}
        </Card>
      )}

      <div className="fade-up stagger-4" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <Button variant="ghost" onClick={() => router.back()}>Try Again</Button>
        <Button onClick={() => router.push('/')}>Home</Button>
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>Dashboard</Button>
      </div>
    </div>
  )
}
