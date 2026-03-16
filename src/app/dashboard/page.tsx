'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SUBJECTS } from '@/data/subjects'
import { NavTabs, Card, StatCard, BarChart, SectionLabel, Button, EmptyState } from '@/components/ui'
import type { DashboardData } from '@/types'
import { computeDashboard, clearAllData } from '@/lib/sessionStore'

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setData(computeDashboard())
    setLoading(false)
  }, [])

  const subjectRows = SUBJECTS.map(s => {
    const stat = data?.bySubject.find(b => b.subjectId === s.id)
    return stat ? { label: `${s.icon} ${s.name}`, pct: stat.pct, color: s.color } : null
  }).filter(Boolean) as { label: string; pct: number; color: string }[]

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '20px 16px 100px' }}>
      {/* Header */}
      <div className="fade-up" style={{ textAlign: 'center', padding: '28px 0 18px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #3b82f6, #a855f7)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: '#fff' }}>R</div>
          <h1 style={{ fontFamily: "'Palatino Linotype', Georgia, serif", fontSize: '1.85rem', color: 'var(--text-bright)', fontWeight: 600 }}>Dashboard</h1>
        </div>
      </div>

      {/* Nav */}
      <div className="fade-up stagger-1">
        <NavTabs
          tabs={[{ id: 'subjects', label: 'Subjects' }, { id: 'dashboard', label: 'Dashboard' }]}
          active="dashboard"
          onChange={id => { if (id === 'subjects') router.push('/') }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>Loading…</div>
      ) : !data || data.overall.total === 0 ? (
        <EmptyState message="No data yet. Start a quiz to see your progress here." />
      ) : (
        <>
          {/* Overall stats */}
          <div className="fade-up stagger-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            <StatCard
              value={`${data.overall.pct}%`}
              label="Overall Accuracy"
              color={data.overall.pct >= 70 ? 'var(--green)' : data.overall.pct >= 40 ? 'var(--amber)' : 'var(--red)'}
            />
            <StatCard value={data.overall.total} label="Questions Answered" />
            <StatCard value={data.mistakeCount} label="Active Mistakes" />
          </div>

          {/* By subject */}
          {subjectRows.length > 0 && (
            <Card className="fade-up stagger-3">
              <SectionLabel>Accuracy by Subject</SectionLabel>
              <BarChart rows={subjectRows} />
            </Card>
          )}

          {/* Weak topics */}
          {data.weakTopics.length > 0 && (
            <Card className="fade-up stagger-4">
              <SectionLabel>Weakest Topics</SectionLabel>
              <BarChart
                rows={data.weakTopics.map(t => ({ label: t.topic, pct: t.pct }))}
              />
            </Card>
          )}

          {/* Recent activity */}
          {data.recentAnswers.length > 0 && (
            <Card className="fade-up stagger-5">
              <SectionLabel>Recent Activity</SectionLabel>
              {data.recentAnswers.slice(0, 8).map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '.82rem' }}>
                  <span style={{ color: a.correct ? 'var(--green)' : a.correct === false ? 'var(--red)' : 'var(--amber)', fontWeight: 700, width: '16px', textAlign: 'center' }}>
                    {a.correct ? '✓' : a.correct === false ? '✗' : '?'}
                  </span>
                  <span style={{ color: 'var(--text)', flex: 1 }}>{a.topic}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '.72rem' }}>{a.subject}</span>
                  {a.score !== null && a.maxScore !== null && (
                    <span style={{ color: 'var(--text-dim)', fontSize: '.72rem' }}>{a.score}/{a.maxScore}</span>
                  )}
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      <div className="fade-up" style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (!confirm('This will delete all your progress. Are you sure?')) return
            clearAllData()
            setData(computeDashboard())
          }}
        >
          Reset All Data
        </Button>
      </div>
    </div>
  )
}
