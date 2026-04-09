import { NextResponse } from 'next/server'
import { getTursoClient } from '@/lib/turso'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = getTursoClient()
    const tables    = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    const qSchema   = await db.execute('PRAGMA table_info(questions)')
    const qSample   = await db.execute('SELECT * FROM questions LIMIT 1')
    const qCount    = await db.execute('SELECT COUNT(*) as n FROM questions')

    let subjectsSchema: unknown[] = []
    let subjectsSample: unknown   = null
    try {
      const ss = await db.execute('PRAGMA table_info(subjects)')
      const sv = await db.execute('SELECT * FROM subjects LIMIT 5')
      subjectsSchema = ss.rows.map(r => ({ name: r.name, type: r.type }))
      subjectsSample = sv.rows
    } catch { /* subjects table may not exist */ }

    return NextResponse.json({
      tables:          tables.rows.map(r => r.name),
      questions: {
        columns:       qSchema.rows.map(r => ({ cid: r.cid, name: r.name, type: r.type })),
        sampleKeys:    qSample.rows[0] ? Object.keys(qSample.rows[0]) : [],
        sampleValues:  qSample.rows[0] ?? null,
        totalRows:     qCount.rows[0]?.n,
      },
      subjects: {
        columns:       subjectsSchema,
        sampleRows:    subjectsSample,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
