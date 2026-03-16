'use client'

import { useRouter } from 'next/navigation'
import { SUBJECTS } from '@/data/subjects'
import { QUESTIONS } from '@/data/questions'
import { NavTabs, SectionLabel } from '@/components/ui'

export default function HomePage() {
  const router = useRouter()

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '20px 16px 100px' }}>
      {/* Header */}
      <div className="fade-up" style={{ textAlign: 'center', padding: '28px 0 18px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div
            style={{
              width: '32px', height: '32px',
              background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '14px', color: '#fff',
            }}
          >
            R
          </div>
          <h1
            style={{
              fontFamily: "'Palatino Linotype', Georgia, serif",
              fontSize: '1.85rem',
              color: 'var(--text-bright)',
              fontWeight: 600,
            }}
          >
            Revision Platform
          </h1>
        </div>
        <div style={{ fontSize: '.82rem', color: 'var(--text-dim)' }}>
          Multi-subject IGCSE &amp; AS Level practice
        </div>
      </div>

      {/* Nav */}
      <div className="fade-up stagger-1">
        <NavTabs
          tabs={[
            { id: 'subjects', label: 'Subjects' },
            { id: 'dashboard', label: 'Dashboard' },
          ]}
          active="subjects"
          onChange={id => { if (id === 'dashboard') router.push('/dashboard') }}
        />
      </div>

      <div className="fade-up stagger-2">
        <SectionLabel>Choose a subject</SectionLabel>
      </div>

      {/* Subject grid */}
      <div
        className="fade-up stagger-2"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '10px',
          marginBottom: '24px',
        }}
      >
        {SUBJECTS.map(s => {
          const count = QUESTIONS.filter(q => q.subject === s.id).length
          return (
            <SubjectCard
              key={s.id}
              subject={s}
              count={count}
              onClick={() => router.push(`/subject/${s.id}`)}
            />
          )
        })}
      </div>
    </div>
  )
}

function SubjectCard({
  subject,
  count,
  onClick,
}: {
  subject: (typeof SUBJECTS)[0]
  count: number
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '18px 16px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        transition: 'var(--transition)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = subject.color
        ;(e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card-hover)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
        ;(e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'none'
      }}
    >
      <div
        style={{
          fontFamily: "'Palatino Linotype', Georgia, serif",
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--text-bright)',
          marginBottom: '2px',
        }}
      >
        {subject.icon} {subject.name}
      </div>
      <div style={{ fontSize: '.75rem', color: 'var(--text-dim)' }}>
        {subject.level} · {subject.syllabus} · {count} questions
      </div>
    </div>
  )
}
