import { NextRequest, NextResponse } from 'next/server'
import type { GradeResult } from '@/types'

interface GradeCloudPayload {
  questionId: string
  userAnswer: string
  isMcq: boolean
  msText: string | null
  msMarks: number | null
  imageUrl?: string | null
}

// Parse the correct MCQ answer letter from mark scheme text.
// Handles formats like: "C", "Answer: C", "The answer is B", "B\n...", "C [1]"
function parseMcqAnswer(msText: string | null): string | null {
  if (!msText) return null
  const text = msText.trim().toUpperCase()
  // Look for a standalone A/B/C/D — first match wins
  const match = text.match(/\b([ABCD])\b/)
  return match ? match[1] : null
}

function gradeMcqCloud(userAnswer: string, msText: string | null, msMarks: number | null): GradeResult {
  const maxScore = msMarks ?? 1
  const correct = parseMcqAnswer(msText)
  const userUpper = userAnswer.trim().toUpperCase()

  if (!correct) {
    // Can't determine correct answer — mark ungraded
    return {
      status: 'ungraded', correct: null,
      score: 0, maxScore,
      gradingType: 'ungraded',
      feedback: 'Could not determine correct answer from mark scheme.',
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

async function gradeOpenAI(
  userAnswer: string,
  msText: string,
  msMarks: number,
): Promise<GradeResult> {
  const OpenAI = (await import('openai')).default
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const systemPrompt = `You are an expert Cambridge exam marker. Grade the student response strictly according to the mark scheme provided. Return ONLY a valid JSON object — no prose outside the JSON.`

  const userPrompt = `Mark scheme (${msMarks} marks total):
${msText}

Student response:
"""
${userAnswer}
"""

Return JSON with this exact structure:
{
  "score": <integer 0-${msMarks}>,
  "maxScore": ${msMarks},
  "strengths": [<strings>],
  "missingPoints": [<strings>],
  "feedback": "<1-2 sentence summary>"
}`

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  })

  const raw = JSON.parse(response.choices[0]?.message?.content ?? '{}') as Record<string, unknown>
  const score = Math.min(Math.max(Number(raw.score ?? 0), 0), msMarks)

  return {
    status: score === msMarks ? 'correct' : score > 0 ? 'partial' : 'incorrect',
    correct: score === msMarks,
    score,
    maxScore: msMarks,
    gradingType: 'ai_rubric',
    strengths: Array.isArray(raw.strengths) ? raw.strengths as string[] : [],
    missingPoints: Array.isArray(raw.missingPoints) ? raw.missingPoints as string[] : [],
    feedback: typeof raw.feedback === 'string' ? raw.feedback : '',
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

  try {
    if (isMcq) {
      const result = gradeMcqCloud(userAnswer, msText, msMarks)
      return NextResponse.json(result)
    }

    // Non-MCQ: use AI grading if available, otherwise ungraded
    if (process.env.OPENAI_API_KEY && msText) {
      const result = await gradeOpenAI(userAnswer, msText, msMarks ?? 4)
      return NextResponse.json(result)
    }

    // No AI key — return ungraded with mark scheme shown
    const result: GradeResult = {
      status: 'ungraded',
      correct: null,
      score: 0,
      maxScore: msMarks ?? 0,
      gradingType: 'ungraded',
      feedback: 'AI grading unavailable. Refer to the mark scheme to self-assess.',
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/grade]', err)
    return NextResponse.json({ error: 'Grading failed' }, { status: 500 })
  }
}
