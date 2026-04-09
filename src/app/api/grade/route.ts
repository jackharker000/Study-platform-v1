import { NextRequest, NextResponse } from 'next/server'
import type { GradeResult } from '@/types'

export const dynamic = 'force-dynamic'

interface GradeCloudPayload {
  questionId: string
  userAnswer: string
  isMcq: boolean
  msText: string | null
  msMarks: number | null
}

// Parse the correct MCQ answer letter (A/B/C/D) from mark scheme text.
// Handles: "C", "Answer: C", "The answer is B", "B\n...", "C [1]"
function parseMcqAnswer(msText: string | null): string | null {
  if (!msText) return null
  const match = msText.trim().toUpperCase().match(/\b([ABCD])\b/)
  return match ? match[1] : null
}

function gradeMcqCloud(userAnswer: string, msText: string | null, msMarks: number | null): GradeResult {
  const maxScore = msMarks ?? 1
  const correct = parseMcqAnswer(msText)
  const userUpper = userAnswer.trim().toUpperCase()

  if (!correct) {
    return {
      status: 'ungraded', correct: null,
      score: 0, maxScore,
      gradingType: 'ungraded',
      feedback: 'Check the mark scheme to verify your answer.',
    }
  }

  const isCorrect = userUpper === correct
  return {
    status: isCorrect ? 'correct' : 'incorrect',
    correct: isCorrect,
    score: isCorrect ? maxScore : 0,
    maxScore,
    gradingType: 'auto',
    feedback: isCorrect ? 'Correct.' : `Incorrect — the answer is ${correct}.`,
  }
}

export async function POST(req: NextRequest) {
  let body: GradeCloudPayload
  try {
    body = await req.json() as GradeCloudPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { userAnswer, isMcq, msText, msMarks } = body

  if (!userAnswer?.trim()) {
    return NextResponse.json({ error: 'userAnswer is required' }, { status: 400 })
  }

  // MCQ: grade automatically by comparing to mark scheme letter
  if (isMcq) {
    return NextResponse.json(gradeMcqCloud(userAnswer, msText, msMarks))
  }

  // Non-MCQ (structured/essay): self-assessed — show mark scheme, no AI cost
  const result: GradeResult = {
    status: 'ungraded',
    correct: null,
    score: 0,
    maxScore: msMarks ?? 0,
    gradingType: 'ungraded',
    feedback: 'Compare your answer to the mark scheme below.',
  }
  return NextResponse.json(result)
}
