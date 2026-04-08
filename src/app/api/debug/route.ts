import { NextResponse } from 'next/server'
import { getTursoClient } from '@/lib/turso'

export async function GET() {
  try {
    const db = getTursoClient()
    const schema = await db.execute('PRAGMA table_info(questions)')
    const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    const sample = await db.execute('SELECT * FROM questions LIMIT 1')
    const count = await db.execute('SELECT COUNT(*) as n FROM questions')

    return NextResponse.json({
      tables: tables.rows.map(r => r.name),
      columns: schema.rows.map(r => ({ cid: r.cid, name: r.name, type: r.type })),
      sampleKeys: sample.rows[0] ? Object.keys(sample.rows[0]) : [],
      sampleValues: sample.rows[0] ?? null,
      totalQuestions: count.rows[0]?.n,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
