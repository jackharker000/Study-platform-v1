import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureDb } from '@/lib/db'
import { QUESTION_MAP } from '@/data/questions'
import { gradeAnswer } from '@/lib/grading'
import type { SubmitAnswerPayload } from '@/types'

export async function POST(req: NextRequest) {
  await ensureDb()
  try {
    const body = (await req.json()) as SubmitAnswerPayload
    const { sessionId, questionId, userAnswer, confidence, timeMs } = body

    const session = await prisma.session.findUnique({ where: { id: sessionId } })
    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    const question = QUESTION_MAP[questionId]
    if (!question) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 })
    }

    // Grade the answer
    const result = gradeAnswer(question, userAnswer)

    // Advance session index
    const questionIds = JSON.parse(session.questionIds) as string[]
    const nextIdx = Math.min(session.currentIdx + 1, questionIds.length)

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        currentIdx: nextIdx,
        status: nextIdx >= questionIds.length ? 'completed' : 'active',
      },
    })

    // Save the answer record
    const answer = await prisma.answer.create({
      data: {
        sessionId,
        questionId,
        subject: question.subject,
        topic: question.topic,
        difficulty: question.difficulty,
        qType: question.questionType,
        userAnswer,
        correct: result.correct,
        score: result.score,
        maxScore: result.maxScore,
        confidence: confidence ?? null,
        timeMs: timeMs ?? null,
        gradingType: result.gradingType,
        aiFeedback: result.feedback ?? null,
      },
    })

    return NextResponse.json({ answer, gradeResult: result, question })
  } catch (err) {
    console.error('[session/answer]', err)
    return NextResponse.json({ error: 'Failed to submit answer.' }, { status: 500 })
  }
}
