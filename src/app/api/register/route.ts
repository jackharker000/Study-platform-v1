import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { getTursoClient } from '@/lib/turso'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; name?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, password, name } = body
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'email, password and name are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  try {
    const db = getTursoClient()

    // Ensure users table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT,
        created_at TEXT NOT NULL
      )
    `)

    const hash = await bcrypt.hash(password, 10)
    const id = uuidv4()

    await db.execute({
      sql: 'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [id, email.toLowerCase().trim(), name.trim(), hash, new Date().toISOString()],
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = String(err)
    if (msg.includes('UNIQUE constraint') || msg.includes('unique')) {
      return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 })
    }
    console.error('[register]', err)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
