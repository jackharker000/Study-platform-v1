import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
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
      score: 0, maxScore, gradingType: 'ungraded',
      feedback: 'Check the mark scheme to verify your answer.',
    }
  }

  const isCorrect = userUpper === correct
  return {
    status: isCorrect ? 'correct' : 'incorrect',
    correct: isCorrect,
    score: isCorrect ? maxScore : 0,
    maxScore, gradingType: 'auto',
    feedback: isCorrect ? 'Correct.' : `Incorrect — the answer is ${correct}.`,
  }
}

// Free AI grading via Groq (OpenAI-compatible endpoint).
// Falls back to 'ungraded' if GROQ_API_KEY is not set.
interface GroqGradeResponse {
  score: number
  feedback: string
  strengths: string[]
  missingPoints: string[]
}

async function gradeWithGroq(
  msText: string,
  userAnswer: string,
  maxScore: number,
): Promise<GradeResult> {
  if (!process.env.GROQ_API_KEY) {
    return {
      status: 'ungraded', correct: null,
      score: 0, maxScore, gradingType: 'ungraded',
      feedback: 'Compare your answer to the mark scheme below.',
    }
  }

  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  })

  let parsed: GroqGradeResponse
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a Cambridge IGCSE/A-Level examiner. Mark the student answer strictly against the mark scheme. ' +
            'Be concise. Respond ONLY with valid JSON in this exact shape: ' +
            '{"score":number,"feedback":"string","strengths":["..."],"missingPoints":["..."]}',
        },
        {
          role: 'user',
          content:
            `Mark scheme (${maxScore} marks total):\n${msText}\n\n` +
            `Student answer:\n${userAnswer}`,
        },
      ],
    })

    const raw = res.choices[0]?.message?.content ?? '{}'
    parsed = JSON.parse(raw) as GroqGradeResponse
  } catch (err) {
    console.error('[grade] Groq error:', err)
    return {
      status: 'ungraded', correct: null,
      score: 0, maxScore, gradingType: 'ungraded',
      feedback: 'AI grading temporarily unavailable. Compare your answer to the mark scheme.',
    }
  }

  const score = Math.max(0, Math.min(maxScore, Math.round(parsed.score ?? 0)))
  const status = score === maxScore ? 'correct' : score > 0 ? 'partial' : 'incorrect'

  return {
    status,
    correct: status === 'correct' ? true : status === 'incorrect' ? false : null,
    score,
    maxScore,
    gradingType: 'ai_rubric',
    feedback: parsed.feedback ?? '',
    strengths: parsed.strengths ?? [],
    missingPoints: parsed.missingPoints ?? [],
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

  if (isMcq) {
    return NextResponse.json(gradeMcqCloud(userAnswer, msText, msMarks))
  }

  // Non-MCQ: use Groq for free AI grading
  const result = await gradeWithGroq(msText ?? '', userAnswer, msMarks ?? 0)
  return NextResponse.json(result)
}
