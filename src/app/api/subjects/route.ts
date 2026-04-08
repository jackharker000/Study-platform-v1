import { NextResponse } from 'next/server'
import { getTursoClient, isTursoConfigured } from '@/lib/turso'
import { SUBJECTS } from '@/data/subjects'
import { QUESTIONS } from '@/data/questions'

export interface SubjectInfo {
  id: string       // app subject ID e.g. "ig_biology"
  name: string
  level: string
  syllabus: string
  color: string
  icon: string
  count: number
}

export async function GET() {
  // If Turso is not configured, fall back to hardcoded data
  if (!isTursoConfigured()) {
    const subjects: SubjectInfo[] = SUBJECTS.map(s => ({
      ...s,
      count: QUESTIONS.filter(q => q.subject === s.id).length,
    }))
    return NextResponse.json(subjects)
  }

  try {
    const db = getTursoClient()

    // Query per-subject counts from the questions table
    const result = await db.execute(`
      SELECT level, subject, COUNT(*) as count
      FROM questions
      GROUP BY level, subject
    `)

    // Map Turso (level, subject) pairs back to app subject IDs
    const tursoCountMap = new Map<string, number>()
    for (const row of result.rows) {
      const key = `${row.level}__${row.subject}`
      tursoCountMap.set(key, Number(row.count))
    }

    const { SUBJECT_TO_TURSO } = await import('@/lib/subjectMap')
    const subjects: SubjectInfo[] = SUBJECTS.map(s => {
      const turso = SUBJECT_TO_TURSO[s.id]
      const count = turso ? (tursoCountMap.get(`${turso.level}__${turso.subject}`) ?? 0) : 0
      return { ...s, count }
    })

    return NextResponse.json(subjects)
  } catch (err) {
    console.error('[api/subjects]', err)
    // Fallback to hardcoded counts on error
    const subjects: SubjectInfo[] = SUBJECTS.map(s => ({
      ...s,
      count: QUESTIONS.filter(q => q.subject === s.id).length,
    }))
    return NextResponse.json(subjects)
  }
}
