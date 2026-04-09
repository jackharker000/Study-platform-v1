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

  const filteredSubjects =
    userSubjectIds && userSubjectIds.length > 0
      ? subjects.filter(s => userSubjectIds.includes(s.id))
      : subjects

  const showingAll = !userSubjectIds || userSubjectIds.length === 0

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

      {showingAll && (
        <p className="fade-up stagger-2" style={{ fontSize: '.8rem', color: 'var(--text-dim)', marginBottom: '12px' }}>
          Showing all courses — select your subjects in{' '}
          <Link href="/settings" style={{ color: 'var(--accent)' }}>Settings</Link>
        </p>
      )}

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
        {filteredSubjects.map(s => (
          <SubjectCard
            key={s.id}
            subject={s}
            count={s.count}
            onClick={() => router.push(`/subject/${s.id}`)}
          />
        ))}
      </div>
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
