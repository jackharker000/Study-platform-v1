import { NextRequest, NextResponse } from 'next/server'
import { getTursoClient, isTursoConfigured } from '@/lib/turso'

export const dynamic = 'force-dynamic'
import { getTursoSubject } from '@/lib/subjectMap'
import { filterQuestions } from '@/data/questions'
import type { CloudQuestion } from '@/types'

function parseTopics(raw: unknown): string[] {
  if (!raw || typeof raw !== 'string') return []
  try { return JSON.parse(raw) } catch { return [] }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const subjectId  = searchParams.get('subjectId') ?? ''
  const paper      = searchParams.get('paper')
  const topic      = searchParams.get('topic')
  const year       = searchParams.get('year')
  const isMcqStr   = searchParams.get('isMcq')
  const limitStr   = searchParams.get('limit') ?? '20'
  const shuffle    = searchParams.get('shuffle') === 'true'
  const countOnly  = searchParams.get('countOnly') === 'true'
  // distinct=topic or distinct=paper returns unique values, not full questions
  const distinct   = searchParams.get('distinct')

  const limit = Math.min(parseInt(limitStr, 10) || 20, 200)

  // ── Fallback: no Turso ─────────────────────────────────────────
  if (!isTursoConfigured()) {
    const filters = {
      paper: paper ?? 'all',
      topic: topic ?? 'all',
      difficulty: 'all',
      questionType: isMcqStr === '1' ? 'mcq' : isMcqStr === '0' ? 'short-answer' : 'all',
    }
    const pool = filterQuestions(subjectId, filters)
    if (countOnly) return NextResponse.json({ count: pool.length })
    if (distinct === 'topic') return NextResponse.json([...new Set(pool.map(q => q.topic))])
    if (distinct === 'paper') return NextResponse.json([...new Set(pool.map(q => q.paper))])

    const questions: CloudQuestion[] = pool.slice(0, limit).map(q => ({
      id: q.id,
      level: q.level,
      subject: q.syllabus,
      syllabusCode: q.syllabus,
      year: 0,
      session: '',
      paper: q.paper,
      questionNum: '',
      isMcq: q.questionType === 'mcq',
      imageUrl: null,
      msText: q.markScheme?.join('\n') ?? null,
      msMarks: q.marks,
      topics: [q.topic],
      skills: q.skillsTested ?? [],
    }))
    return NextResponse.json(questions)
  }

  // ── Turso path ─────────────────────────────────────────────────
  try {
    const db = getTursoClient()
    const turso = getTursoSubject(subjectId)

    // distinct=topic / distinct=paper — return unique filter values
    if (distinct === 'topic' || distinct === 'paper') {
      let col = distinct === 'topic' ? 'topics' : 'paper'
      if (distinct === 'paper') {
        const where: string[] = []
        const args: (string | number)[] = []
        if (turso) { where.push('level = ?', 'subject = ?'); args.push(turso.level, turso.subject) }
        const sql = `SELECT DISTINCT paper FROM questions${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY paper`
        const r = await db.execute({ sql, args })
        return NextResponse.json(r.rows.map(row => row[col as keyof typeof row]))
      }
      // For topics (stored as JSON array), we need to aggregate
      const where: string[] = []
      const args: (string | number)[] = []
      if (turso) { where.push('level = ?', 'subject = ?'); args.push(turso.level, turso.subject) }
      const sql = `SELECT topics FROM questions${where.length ? ' WHERE ' + where.join(' AND ') : ''}`
      const r = await db.execute({ sql, args })
      const topicsSet = new Set<string>()
      for (const row of r.rows) {
        for (const t of parseTopics(row.topics)) topicsSet.add(t)
      }
      return NextResponse.json([...topicsSet].sort())
    }

    // Build WHERE clause
    const conditions: string[] = []
    const args: (string | number)[] = []

    if (turso) {
      conditions.push('level = ?', 'subject = ?')
      args.push(turso.level, turso.subject)
    }
    if (paper && paper !== 'all') {
      conditions.push('paper = ?')
      args.push(paper)
    }
    if (year && year !== 'all') {
      conditions.push('year = ?')
      args.push(parseInt(year, 10))
    }
    if (isMcqStr === '1') {
      conditions.push('is_mcq = 1')
    } else if (isMcqStr === '0') {
      conditions.push('is_mcq = 0')
    }
    if (topic && topic !== 'all') {
      conditions.push("topics LIKE ?")
      args.push(`%${topic}%`)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    if (countOnly) {
      const sql = `SELECT COUNT(*) as count FROM questions ${whereClause}`
      const r = await db.execute({ sql, args })
      return NextResponse.json({ count: Number(r.rows[0]?.count ?? 0) })
    }

    const orderBy = shuffle ? 'ORDER BY RANDOM()' : 'ORDER BY year DESC, paper, CAST(question_num AS INTEGER)'
    const sql = `
      SELECT id, level, subject, syllabus_code, year, session, paper,
             question_num, is_mcq, pdf_url, ms_text, ms_marks, topics, skills
      FROM questions
      ${whereClause}
      ${orderBy}
      LIMIT ?
    `
    args.push(limit)

    const result = await db.execute({ sql, args })

    const questions: CloudQuestion[] = result.rows.map(row => ({
      id:           String(row.id ?? ''),
      level:        String(row.level ?? ''),
      subject:      String(row.subject ?? ''),
      syllabusCode: String(row.syllabus_code ?? ''),
      year:         Number(row.year ?? 0),
      session:      String(row.session ?? ''),
      paper:        String(row.paper ?? ''),
      questionNum:  String(row.question_num ?? ''),
      isMcq:        Number(row.is_mcq) === 1,
      imageUrl:     row.pdf_url ? String(row.pdf_url) : null,
      msText:       row.ms_text ? String(row.ms_text) : null,
      msMarks:      row.ms_marks != null ? Number(row.ms_marks) : null,
      topics:       parseTopics(row.topics),
      skills:       parseTopics(row.skills),
    }))

    return NextResponse.json(questions)
  } catch (err) {
    console.error('[api/questions]', err)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }
}
