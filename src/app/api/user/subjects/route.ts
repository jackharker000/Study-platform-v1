import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getTursoClient } from '@/lib/turso'

export const dynamic = 'force-dynamic'

async function ensureTable(db: ReturnType<typeof getTursoClient>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_subjects (
      user_id    TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      PRIMARY KEY (user_id, subject_id)
    )
  `)
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = getTursoClient()
    await ensureTable(db)

    const result = await db.execute({
      sql: 'SELECT subject_id FROM user_subjects WHERE user_id = ?',
      args: [session.user.id],
    })

    const subjectIds = result.rows.map(row => String(row.subject_id))
    return NextResponse.json(subjectIds)
  } catch (err) {
    console.error('[api/user/subjects GET]', err)
    return NextResponse.json({ error: 'Failed to load subjects' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { subjectIds?: string[] }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { subjectIds } = body
  if (!Array.isArray(subjectIds)) {
    return NextResponse.json({ error: 'subjectIds must be an array' }, { status: 400 })
  }

  try {
    const db = getTursoClient()
    await ensureTable(db)

    // Replace all selections atomically
    await db.execute({
      sql: 'DELETE FROM user_subjects WHERE user_id = ?',
      args: [session.user.id],
    })

    for (const subjectId of subjectIds) {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO user_subjects (user_id, subject_id) VALUES (?, ?)',
        args: [session.user.id, subjectId],
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/user/subjects POST]', err)
    return NextResponse.json({ error: 'Failed to save subjects' }, { status: 500 })
  }
}
