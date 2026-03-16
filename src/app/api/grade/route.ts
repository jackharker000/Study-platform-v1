import { NextRequest, NextResponse } from 'next/server'
import { QUESTION_MAP } from '@/data/questions'
import { gradeAnswer } from '@/lib/grading'
import type { GradePayload } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GradePayload
    const { questionId, userAnswer, useAI } = body

    const question = QUESTION_MAP[questionId]
    if (!question) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 })
    }

    // Try AI grading if requested and available
    if (useAI && question.aiMarkable && process.env.OPENAI_API_KEY) {
      try {
        const { gradeWithAI } = await import('@/lib/openai')
        const result = await gradeWithAI(question, userAnswer)
        return NextResponse.json({ result, question })
      } catch (aiErr) {
        console.warn('[grade] AI grading failed, falling back to heuristic:', aiErr)
      }
    }

    const result = gradeAnswer(question, userAnswer)
    return NextResponse.json({ result, question })
  } catch (err) {
    console.error('[grade]', err)
    return NextResponse.json({ error: 'Grading failed.' }, { status: 500 })
  }
}
