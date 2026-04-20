'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { NavTabs, SectionLabel } from '@/components/ui'
import type { SubjectInfo } from '@/app/api/subjects/route'

export default function HomePage() {
  const router = useRouter()
  const [subjects, setSubjects] = useState<SubjectInfo[]>([])
  const [userSubjectIds, setUserSubjectIds] = useState<string[] | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/subjects').then(r => r.json()) as Promise<SubjectInfo[]>,
      fetch('/api/user/subjects').then(r => r.json()).catch(() => []) as Promise<string[]>,
    ]).then(([allSubjects, userIds]) => {
      setSubjects(allSubjects)
      setUserSubjectIds(Array.isArray(userIds) ? userIds : [])
    }).catch(() => { /* keep empty */ })
  }, [])

  const hasSelectedSubjects = userSubjectIds !== null && userSubjectIds.length > 0
  const filteredSubjects = hasSelectedSubjects
    ? subjects.filter(s => userSubjectIds!.includes(s.id))
    : []

  const isLoaded = userSubjectIds !== null

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '20px 16px 100px' }}>

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

      <div className="fade-up stagger-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <SectionLabel>Choose a subject</SectionLabel>
        <Link
          href="/settings"
          style={{ fontSize: '.8rem', color: 'var(--accent)', textDecoration: 'none' }}
        >
          Manage courses
        </Link>
      </div>

      {/* Empty state */}
      {isLoaded && !hasSelectedSubjects && (
        <div className="fade-up stagger-2" style={{
          textAlign: 'center',
          padding: '60px 24px',
          color: 'var(--text-dim)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📚</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
            No courses selected
          </div>
          <p style={{ fontSize: '.88rem', marginBottom: '20px' }}>
            Add your subjects in Settings to get started.
          </p>
          <Link
            href="/settings"
            style={{
              display: 'inline-block',
              padding: '9px 22px',
              background: 'var(--accent)',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              fontSize: '.88rem',
              fontWeight: 600,
            }}
          >
            Go to Settings
          </Link>
        </div>
      )}

      {/* Subject grid */}
      {filteredSubjects.length > 0 && (
        <div
          className="fade-up stagger-2"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '10px',
            marginBottom: '24px',
          }}
        >
          {filteredSubjects.map(s => (
            <SubjectCard
              key={s.id}
              subject={s}
              count={s.count}
              onClick={() => router.push(`/subject/${s.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SubjectCard({
  subject,
  count,
  onClick,
}: {
  subject: SubjectInfo
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
        {subject.level} · {subject.syllabus} · {count > 0 ? count.toLocaleString() : '…'} questions
      </div>
    </div>
  )
}
