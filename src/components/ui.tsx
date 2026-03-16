'use client'

import React from 'react'

// ─── Card ─────────────────────────────────────────────────────────

export function Card({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        marginBottom: '16px',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── Button ───────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'ghost' | 'danger'

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  onClick,
  type = 'button',
  className = '',
  style,
}: {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
  style?: React.CSSProperties
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontFamily: 'inherit',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'var(--transition)',
    opacity: disabled ? 0.35 : 1,
    ...(size === 'sm' ? { padding: '7px 14px', fontSize: '.78rem' } : { padding: '11px 24px', fontSize: '.85rem' }),
  }

  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary:  { background: 'var(--accent)', color: '#fff' },
    ghost:    { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)' },
    danger:   { background: 'transparent', border: '1px solid rgba(239,68,68,.3)', color: 'var(--red)' },
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={className}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  )
}

// ─── Badge ────────────────────────────────────────────────────────

const BADGE_COLORS: Record<string, React.CSSProperties> = {
  easy:        { background: 'var(--green-bg)',   color: 'var(--green)' },
  medium:      { background: 'var(--amber-bg)',   color: 'var(--amber)' },
  hard:        { background: 'var(--red-bg)',     color: 'var(--red)' },
  topic:       { background: '#3b82f612',         color: 'var(--accent)' },
  type:        { background: '#06b6d412',         color: 'var(--cyan)' },
  marks:       { background: '#3b82f612',         color: 'var(--accent)' },
}

export function Badge({ label, kind = 'topic' }: { label: string; kind?: string }) {
  const style = BADGE_COLORS[kind] ?? BADGE_COLORS.topic
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 9px',
        borderRadius: '20px',
        fontSize: '.68rem',
        fontWeight: 600,
        textTransform: 'capitalize',
        ...style,
      }}
    >
      {label}
    </span>
  )
}

// ─── ProgressBar ─────────────────────────────────────────────────

export function ProgressBar({
  value,
  max,
  label,
  sublabel,
}: {
  value: number
  max: number
  label?: string
  sublabel?: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: '18px' }}>
      {(label || sublabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '.75rem' }}>
          {label && <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>{label}</span>}
          {sublabel && <span style={{ color: 'var(--accent)' }}>{sublabel}</span>}
        </div>
      )}
      <div style={{ height: '5px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--accent)',
            borderRadius: '3px',
            transition: 'width .5s ease',
          }}
        />
      </div>
    </div>
  )
}

// ─── SectionLabel ─────────────────────────────────────────────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: '.78rem',
        fontWeight: 600,
        color: 'var(--text-dim)',
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        marginBottom: '10px',
      }}
    >
      {children}
    </h2>
  )
}

// ─── NavTabs ──────────────────────────────────────────────────────

export function NavTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        padding: '4px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        marginBottom: '24px',
        overflowX: 'auto',
      }}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1,
            padding: '9px 12px',
            border: 'none',
            background: active === tab.id ? 'var(--accent)' : 'transparent',
            color: active === tab.id ? '#fff' : 'var(--text-dim)',
            fontSize: '.8rem',
            fontWeight: active === tab.id ? 600 : 500,
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'var(--transition)',
            whiteSpace: 'nowrap',
            fontFamily: 'inherit',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── Chip / ChipRow ───────────────────────────────────────────────

export function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '5px 12px',
        borderRadius: '20px',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: active ? 'var(--accent)' : 'var(--bg-card)',
        color: active ? '#fff' : 'var(--text-dim)',
        fontSize: '.72rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'var(--transition)',
      }}
    >
      {label}
    </div>
  )
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>{children}</div>
}

// ─── BarChart ─────────────────────────────────────────────────────

export function BarChart({
  rows,
}: {
  rows: { label: string; pct: number; color?: string }[]
}) {
  return (
    <div>
      {rows.map(row => (
        <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div
            style={{
              width: '120px',
              fontSize: '.78rem',
              color: 'var(--text)',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {row.label}
          </div>
          <div style={{ flex: 1, height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${row.pct}%`,
                borderRadius: '4px',
                transition: 'width .5s ease',
                background: row.color ?? (row.pct >= 70 ? 'var(--green)' : row.pct >= 40 ? 'var(--amber)' : 'var(--red)'),
              }}
            />
          </div>
          <div style={{ width: '44px', textAlign: 'right', fontSize: '.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>
            {row.pct}%
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────

export function StatCard({
  value,
  label,
  color,
}: {
  value: string | number
  label: string
  color?: string
}) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '16px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: "'Palatino Linotype', Georgia, serif",
          fontSize: '1.6rem',
          fontWeight: 700,
          color: color ?? 'var(--text-bright)',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────

export function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (val: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '7px 12px',
        background: 'var(--bg-input)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text)',
        fontSize: '.78rem',
        fontFamily: 'inherit',
        cursor: 'pointer',
        minWidth: '120px',
      }}
    >
      {children}
    </select>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────

export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-dim)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.4 }}>📭</div>
      <div style={{ fontSize: '.9rem' }}>{message}</div>
    </div>
  )
}
