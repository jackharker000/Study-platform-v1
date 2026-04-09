'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function NavBar() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    // Read the theme that was set by the inline script
    const t = document.documentElement.getAttribute('data-theme')
    setTheme(t === 'light' ? 'light' : 'dark')
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('rp-theme', next) } catch { /* ignore */ }
  }

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: "'Palatino Linotype', Georgia, serif",
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--text-bright)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span
          style={{
            width: '24px', height: '24px',
            background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
            borderRadius: '6px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '12px', color: '#fff',
          }}
        >
          R
        </span>
        Revision Platform
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{
            width: '34px', height: '34px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-dim)',
            fontSize: '1rem',
            transition: 'var(--transition)',
          }}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        {/* Settings */}
        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          style={{
            width: '34px', height: '34px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-dim)',
            fontSize: '1rem',
            textDecoration: 'none',
            transition: 'var(--transition)',
          }}
        >
          ⚙
        </Link>
      </div>
    </header>
  )
}
