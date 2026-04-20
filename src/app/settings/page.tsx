'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { SubjectInfo } from '@/app/api/subjects/route'

type ThemePref = 'dark' | 'light' | 'system'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [subjects, setSubjects] = useState<SubjectInfo[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [themePref, setThemePref] = useState<ThemePref>('system')
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | 'igcse' | 'as' | 'a'>('all')

  // Load theme pref from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rp-theme') as ThemePref | null
      setThemePref(stored ?? 'system')
    } catch { /* ignore */ }
  }, [])

  // Load subjects + user selections
  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return

    Promise.all([
      fetch('/api/subjects').then(r => r.json()) as Promise<SubjectInfo[]>,
      fetch('/api/user/subjects').then(r => r.json()) as Promise<string[]>,
    ]).then(([allSubjects, userSubjectIds]) => {
      setSubjects(allSubjects)
      setSelected(new Set(Array.isArray(userSubjectIds) ? userSubjectIds : []))
    }).catch(console.error)
  }, [status, router])

  function toggleSubject(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSaved(false)
  }

  async function saveCourses() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/user/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectIds: [...selected] }),
      })
      setSaved(true)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  function applyTheme(pref: ThemePref) {
    setThemePref(pref)
    try {
      if (pref === 'system') {
        localStorage.removeItem('rp-theme')
        const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.setAttribute('data-theme', sysDark ? 'dark' : 'light')
      } else {
        localStorage.setItem('rp-theme', pref)
        document.documentElement.setAttribute('data-theme', pref)
      }
    } catch { /* ignore */ }
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px 24px',
    marginBottom: '16px',
  }
  const sectionTitle: React.CSSProperties = {
    fontFamily: "'Palatino Linotype', Georgia, serif",
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--text-bright)',
    marginBottom: '16px',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '.8rem',
    color: 'var(--text-dim)',
    marginBottom: '4px',
  }
  const valueStyle: React.CSSProperties = {
    fontSize: '.95rem',
    color: 'var(--text)',
    marginBottom: '12px',
  }

  if (status === 'loading') return null

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '28px 16px 100px' }}>
      <h1 style={{
        fontFamily: "'Palatino Linotype', Georgia, serif",
        fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-bright)',
        marginBottom: '24px',
      }}>
        Settings
      </h1>

      {/* Account */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Account</div>
        <div style={labelStyle}>Name</div>
        <div style={valueStyle}>{session?.user?.name ?? '—'}</div>
        <div style={labelStyle}>Email</div>
        <div style={valueStyle}>{session?.user?.email ?? '—'}</div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            marginTop: '4px',
            padding: '8px 18px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text)',
            fontSize: '.88rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Sign out
        </button>
      </div>

      {/* Appearance */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Appearance</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['system', 'light', 'dark'] as ThemePref[]).map(opt => (
            <button
              key={opt}
              onClick={() => applyTheme(opt)}
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: themePref === opt ? 'var(--accent)' : 'var(--border)',
                background: themePref === opt ? 'var(--accent)' : 'transparent',
                color: themePref === opt ? '#fff' : 'var(--text)',
                fontSize: '.88rem',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'capitalize',
              }}
            >
              {opt === 'system' ? 'System default' : opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* My Courses */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={sectionTitle}>My Courses</div>
          <button
            onClick={saveCourses}
            disabled={saving}
            style={{
              padding: '8px 20px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '.88rem',
              fontWeight: 600,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
        <p style={{ fontSize: '.82rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
          Select the courses you study. Only selected courses will appear on the home page.
        </p>

        {/* Search & filter */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: '1 1 180px',
              padding: '8px 12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text)',
              fontSize: '.88rem',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value as typeof levelFilter)}
            style={{
              padding: '8px 12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text)',
              fontSize: '.88rem',
              fontFamily: 'inherit',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">All levels</option>
            <option value="igcse">IGCSE</option>
            <option value="as">AS</option>
            <option value="a">A Level</option>
          </select>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '8px',
        }}>
          {subjects
            .filter(s => {
              const q = search.trim().toLowerCase()
              const matchesSearch = !q ||
                s.name.toLowerCase().includes(q) ||
                s.syllabus.toLowerCase().includes(q)
              const lvl = s.level.toLowerCase()
              const matchesLevel =
                levelFilter === 'all' ||
                (levelFilter === 'igcse' && lvl.includes('igcse')) ||
                (levelFilter === 'as' && lvl === 'as') ||
                (levelFilter === 'a' && (lvl === 'a2' || lvl === 'a level' || lvl === 'a'))
              return matchesSearch && matchesLevel
            })
            .map(s => {
              const isSelected = selected.has(s.id)
              return (
                <div
                  key={s.id}
                  onClick={() => toggleSubject(s.id)}
                  style={{
                    padding: '12px 14px',
                    background: isSelected ? 'color-mix(in srgb, var(--accent) 12%, var(--bg-card))' : 'var(--bg-card)',
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    userSelect: 'none',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '6px',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: '.88rem',
                        fontWeight: 600,
                        color: isSelected ? 'var(--accent)' : 'var(--text-bright)',
                        marginBottom: '2px',
                      }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-dim)', marginBottom: '2px' }}>
                        {s.level} · <span style={{ fontFamily: 'monospace', letterSpacing: '.03em' }}>{s.syllabus}</span>
                      </div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-dim)' }}>
                        {s.count.toLocaleString()} questions
                      </div>
                    </div>
                    <div style={{
                      width: '18px', height: '18px', flexShrink: 0,
                      borderRadius: '4px',
                      border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: '2px',
                    }}>
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
