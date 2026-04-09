import { NextResponse } from 'next/server'
import { getTursoClient, isTursoConfigured } from '@/lib/turso'
import { SUBJECTS } from '@/data/subjects'
import { QUESTIONS } from '@/data/questions'

export const dynamic = 'force-dynamic'

export interface SubjectInfo {
  id: string
  name: string
  level: string
  syllabus: string
  color: string
  icon: string
  count: number
}

const LEVEL_DISPLAY: Record<string, string> = {
  ig: 'IGCSE', as: 'AS Level', a2: 'A Level',
}

export async function GET() {
  if (!isTursoConfigured()) {
    const subjects: SubjectInfo[] = SUBJECTS.map(s => ({
      ...s,
      count: QUESTIONS.filter(q => q.subject === s.id).length,
    }))
    return NextResponse.json(subjects)
  }

  try {
    const db = getTursoClient()
    const result = await db.execute(
      `SELECT id, name, level, syllabus, icon, color, question_count FROM subjects
       WHERE question_count >= 30
         AND name IS NOT NULL AND name != '' AND name != 'Unknown'
       ORDER BY level, name`
    )

    const subjects: SubjectInfo[] = result.rows.map(row => ({
      id:      String(row.id ?? ''),
      name:    String(row.name ?? ''),
      level:   LEVEL_DISPLAY[String(row.level ?? '')] ?? String(row.level ?? '').toUpperCase(),
      syllabus: String(row.syllabus ?? ''),
      color:   String(row.color ?? '#6b7280'),
      icon:    String(row.icon ?? ''),
      count:   Number(row.question_count ?? 0),
    }))

    return NextResponse.json(subjects)
  } catch (err) {
    console.error('[api/subjects]', err)
    const subjects: SubjectInfo[] = SUBJECTS.map(s => ({
      ...s,
      count: QUESTIONS.filter(q => q.subject === s.id).length,
    }))
    return NextResponse.json(subjects)
  }
}
