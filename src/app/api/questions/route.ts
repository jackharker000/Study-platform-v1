import { NextRequest, NextResponse } from 'next/server'
import { getTursoClient, isTursoConfigured } from '@/lib/turso'
import { filterQuestions } from '@/data/questions'
import type { CloudQuestion } from '@/types'

export const dynamic = 'force-dynamic'

const LEVEL_DISPLAY: Record<string, string> = {
  ig: 'IGCSE', as: 'AS Level', a2: 'A Level',
}

function parseTopics(raw: unknown): string[] {
  if (!raw || typeof raw !== 'string') return []
  // populate-topics.js writes "section||topic||subtopic" (not JSON)
  if (raw.includes('||')) return raw.split('||').map(s => s.trim()).filter(Boolean)
  try { return JSON.parse(raw) } catch { return [] }
}

// Fallback: if DB says not MCQ but ms_text is a single A/B/C/D answer, override
function detectIsMcq(dbFlag: number, msText: string | null): boolean {
  if (dbFlag === 1) return true
  if (!msText) return false
  const firstLine = msText.trim().split('\n')[0].trim()
  // Matches "C", "B [1]", "A (1)" — a lone letter with optional mark notation
  return /^[A-D]\s*(\[\d+\]|\(\d+\))?$/i.test(firstLine)
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
  const distinct   = searchParams.get('distinct')   // 'topic' | 'paper' | 'year'

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
    if (distinct === 'year')  return NextResponse.json([])

    const questions: CloudQuestion[] = pool.slice(0, limit).map(q => ({
      id: q.id, level: q.level, subject: q.syllabus, syllabusCode: q.syllabus,
      year: 0, session: '', paper: q.paper, questionNum: '',
      isMcq: q.questionType === 'mcq', imageUrl: null,
      msText: q.markScheme?.join('\n') ?? null, msMarks: q.marks,
      topics: [q.topic], skills: [],
    }))
    return NextResponse.json(questions)
  }

  // ── Turso path ─────────────────────────────────────────────────
  try {
    const db = getTursoClient()

    // Build WHERE args
    const conditions: string[] = []
    const args: (string | number)[] = []

    if (subjectId) {
      conditions.push('q.subject_id = ?')
      args.push(subjectId)
    }
    if (paper && paper !== 'all') {
      conditions.push('q.paper = ?')
      args.push(paper)
    }
    if (year && year !== 'all') {
      conditions.push('q.year = ?')
      args.push(parseInt(year, 10))
    }
    if (isMcqStr === '1') conditions.push('q.is_mcq = 1')
    else if (isMcqStr === '0') conditions.push('q.is_mcq = 0')
    if (topic && topic !== 'all') {
      // Use the dedicated topic column written by populate-topics.js
      conditions.push('q.topic = ?')
      args.push(topic)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    // ── distinct queries (return unique filter values) ─────────
    if (distinct === 'paper') {
      const r = await db.execute({
        sql: `SELECT DISTINCT q.paper FROM questions q ${where} ORDER BY q.paper`,
        args,
      })
      return NextResponse.json(r.rows.map(row => row.paper))
    }

    if (distinct === 'year') {
      const r = await db.execute({
        sql: `SELECT DISTINCT q.year FROM questions q ${where} ORDER BY q.year DESC`,
        args,
      })
      return NextResponse.json(r.rows.map(row => String(row.year)))
    }

    if (distinct === 'topic') {
      // Use the dedicated `topic` column (written by populate-topics.js)
      // Falls back to parsing legacy `topics` col for any unclassified rows
      const r = await db.execute({
        sql: `SELECT DISTINCT q.topic FROM questions q ${where} AND q.topic IS NOT NULL AND q.topic != '' ORDER BY q.topic`,
        args,
      })
      const classified = r.rows.map(row => String(row.topic)).filter(Boolean)
      if (classified.length > 0) return NextResponse.json(classified)

      // Fallback: parse legacy topics column
      const r2 = await db.execute({
        sql: `SELECT q.topics FROM questions q ${where} AND q.topics IS NOT NULL`,
        args,
      })
      const topicsSet = new Set<string>()
      for (const row of r2.rows) {
        const parts = parseTopics(row.topics)
        if (parts[1]) topicsSet.add(parts[1]) // index 1 = topic (after section)
        else if (parts[0]) topicsSet.add(parts[0])
      }
      return NextResponse.json([...topicsSet].sort())
    }

    // ── count only ─────────────────────────────────────────────
    if (countOnly) {
      const r = await db.execute({
        sql: `SELECT COUNT(*) as count FROM questions q ${where}`,
        args,
      })
      return NextResponse.json({ count: Number(r.rows[0]?.count ?? 0) })
    }

    // ── full question fetch (with subjects JOIN for display info) ─
    const orderBy = shuffle
      ? 'ORDER BY RANDOM()'
      : 'ORDER BY q.year DESC, q.paper, CAST(q.question_num AS INTEGER)'

    const r = await db.execute({
      sql: `
        SELECT q.id, q.subject_id, q.year, q.session, q.session_name, q.paper,
               q.question_num, q.is_mcq, q.ms_marks, q.ms_text, q.ms_guidance,
               q.topic, q.subtopic, q.topics, q.pdf_url,
               s.name  AS subject_name,
               s.level AS subject_level,
               s.syllabus AS subject_syllabus
        FROM questions q
        LEFT JOIN subjects s ON q.subject_id = s.id
        ${where}
        ${orderBy}
        LIMIT ?
      `,
      args: [...args, limit],
    })

    const questions: CloudQuestion[] = r.rows.map(row => {
      const lvlCode = String(row.subject_level ?? '')
      const level   = LEVEL_DISPLAY[lvlCode] ?? lvlCode.toUpperCase()
      const msNote  = row.ms_guidance ? `\n\n[Guidance]\n${String(row.ms_guidance)}` : ''

      // Prefer dedicated topic/subtopic columns; fall back to parsing legacy `topics`
      const topicName    = row.topic    ? String(row.topic)    : null
      const subtopicName = row.subtopic ? String(row.subtopic) : null
      const topicsArray  = topicName
        ? [topicName, ...(subtopicName ? [subtopicName] : [])]
        : parseTopics(row.topics)

      return {
        id:           String(row.id ?? ''),
        level,
        subject:      String(row.subject_name ?? row.subject_id ?? ''),
        syllabusCode: String(row.subject_syllabus ?? ''),
        year:         Number(row.year ?? 0),
        session:      String(row.session ?? ''),
        paper:        String(row.paper ?? ''),
        questionNum:  String(row.question_num ?? ''),
        isMcq:        detectIsMcq(Number(row.is_mcq), row.ms_text ? String(row.ms_text) : null),
        imageUrl:     row.pdf_url ? String(row.pdf_url) : null,
        msText:       row.ms_text ? String(row.ms_text) + msNote : null,
        msMarks:      row.ms_marks != null ? Number(row.ms_marks) : null,
        topics:       topicsArray,
        skills:       [],
      }
    })

    return NextResponse.json(questions)
  } catch (err) {
    console.error('[api/questions]', err)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }
}
