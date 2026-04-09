'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json() as { ok?: boolean; error?: string }
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Registration failed')
    } else {
      router.push('/login?registered=1')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text)',
    fontSize: '.9rem', fontFamily: 'inherit',
  }

  return (
    <div style={{ maxWidth: '380px', margin: '60px auto', padding: '0 16px' }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '32px',
      }}>
        <h1 style={{
          fontFamily: "'Palatino Linotype', Georgia, serif",
          fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-bright)',
          marginBottom: '6px',
        }}>
          Create account
        </h1>
        <p style={{ fontSize: '.8rem', color: 'var(--text-dim)', marginBottom: '24px' }}>
          Or{' '}
          <Link href="/login" style={{ color: 'var(--accent)' }}>sign in with Google</Link>
          {' '}— no registration needed
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text" placeholder="Your name" required
            value={name} onChange={e => setName(e.target.value)}
            style={inputStyle}
          />
          <input
            type="email" placeholder="Email" required
            value={email} onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password" placeholder="Password (min 8 chars)" required minLength={8}
            value={password} onChange={e => setPassword(e.target.value)}
            style={inputStyle}
          />
          {error && (
            <div style={{ fontSize: '.82rem', color: 'var(--red)' }}>{error}</div>
          )}
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '10px',
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontSize: '.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={{ marginTop: '16px', fontSize: '.8rem', color: 'var(--text-dim)', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
