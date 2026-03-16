import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { filterQuestions, shuffleArray, QUESTION_MAP } from '@/data/questions'
import type { StartSessionPayload, SessionMode } from '@/types'

function selectQuestions(
  pool: typeof import('@/data/questions').QUESTIONS,
  count: number,
  mode: SessionMode,
  mistakeIds?: string[],
) {
  if (mode === 'mistakes' && mistakeIds?.length) {
    const mistakeSet = new Set(mistakeIds)
    const mistakes = pool.filter(q => mistakeSet.has(q.id))
    return shuffleArray(mistakes).slice(0, count)
  }
  return shuffleArray(pool).slice(0, count)
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StartSessionPayload
    const { subject, mode, filters, count } = body

    const pool = filterQuestions(subject, filters)
    if (pool.length === 0) {
      return NextResponse.json({ error: 'No questions match the selected filters.' }, { status: 400 })
    }

    const selected = selectQuestions(pool, mode === 'flashcard' ? pool.length : count, mode)

    const session = await prisma.session.create({
      data: {
        subject: subject ?? null,
        mode,
        filters: JSON.stringify(filters),
        questionIds: JSON.stringify(selected.map(q => q.id)),
        currentIdx: 0,
        status: 'active',
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      questionIds: selected.map(q => q.id),
      questions: selected,
      mode,
    })
  } catch (err) {
    console.error('[session/start]', err)
    return NextResponse.json({ error: 'Failed to start session.' }, { status: 500 })
  }
}
