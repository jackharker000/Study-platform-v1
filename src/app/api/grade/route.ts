import { NextRequest, NextResponse } from 'next/server'
import type { GradeResult } from '@/types'
import { callAI, selectTextModel, selectVisionModel, extractText } from '@/lib/ai-providers'

export const dynamic = 'force-dynamic'

interface GradePartPayload {
  label: string
  msText: string
  marks: number
  userAnswer: string
  canvasBase64?: string | null
}

interface GradeCloudPayload {
  questionId: string
  userAnswer: string
  isMcq: boolean
  msText: string | null
  msMarks: number | null
  imageUrl?: string | null
  canvasBase64?: string | null
  parts?: GradePartPayload[]  // multipart: grade each part independently
}

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
    return { status: 'ungraded', correct: null, score: 0, maxScore, gradingType: 'ungraded',
      feedback: 'Check the mark scheme to verify your answer.' }
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

interface ParsedGrade {
  score: number; feedback: string; strengths: string[]; missingPoints: string[]
}

function buildGradeResult(maxScore: number, parsed: ParsedGrade): GradeResult {
  const score = Math.max(0, Math.min(maxScore, Math.round(parsed.score ?? 0)))
  const status = score === maxScore ? 'correct' : score > 0 ? 'partial' : 'incorrect'
  return {
    status,
    correct: status === 'correct' ? true : status === 'incorrect' ? false : null,
    score, maxScore, gradingType: 'ai_rubric',
    feedback: parsed.feedback ?? '',
    strengths: parsed.strengths ?? [],
    missingPoints: parsed.missingPoints ?? [],
  }
}

const SYSTEM_PROMPT =
  'You are a Cambridge IGCSE/A-Level examiner. Mark the student answer strictly against the mark scheme. ' +
  'Be concise. Respond ONLY with valid JSON: ' +
  '{"score":number,"feedback":"string","strengths":["..."],"missingPoints":["..."]}'

async function gradeTextAnswer(
  msText: string, userAnswer: string, maxScore: number
): Promise<GradeResult> {
  try {
    const tier = selectTextModel(maxScore, false)
    const response = await callAI(tier, [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Mark scheme (${maxScore} marks):\n${msText}\n\nStudent answer:\n${userAnswer}` },
    ], { temperature: 0.1, max_tokens: 500, response_format: { type: 'json_object' } })
    const parsed = JSON.parse(extractText(response)) as ParsedGrade
    return buildGradeResult(maxScore, parsed)
  } catch (err) {
    console.error('[grade] text grading error:', err)
    return { status: 'ungraded', correct: null, score: 0, maxScore, gradingType: 'ungraded',
      feedback: 'AI grading temporarily unavailable. Compare your answer to the mark scheme.' }
  }
}

async function gradeHandwrittenAnswer(
  canvasBase64: string, msText: string, maxScore: number
): Promise<GradeResult> {
  try {
    const tier = selectVisionModel(maxScore)
    const response = await callAI(tier, [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are a Cambridge examiner. The image shows a student's handwritten answer.\n\nMark scheme (${maxScore} marks):\n${msText}\n\nMark what is written in the image. Respond ONLY with valid JSON: {"score":number,"feedback":"string","strengths":["..."],"missingPoints":["..."]}`,
          },
          { type: 'image_url', image_url: { url: canvasBase64 } },
        ],
      },
    ], { temperature: 0.1, max_tokens: 500 })
    const parsed = JSON.parse(extractText(response)) as ParsedGrade
    return buildGradeResult(maxScore, parsed)
  } catch (err) {
    console.error('[grade] vision grading error:', err)
    // Fall back to text grading if vision fails
    return gradeTextAnswer(msText, '[handwritten answer — vision unavailable]', maxScore)
  }
}

async function gradeMultipart(parts: GradePartPayload[]): Promise<GradeResult> {
  // Grade all parts in parallel
  const partResults = await Promise.all(parts.map(async p => {
    if (!p.userAnswer?.trim() && !p.canvasBase64) {
      return { label: p.label, result: { status: 'ungraded' as const, correct: null, score: 0, maxScore: p.marks, gradingType: 'ungraded' as const, feedback: 'No answer provided.' } }
    }
    const result = p.canvasBase64
      ? await gradeHandwrittenAnswer(p.canvasBase64, p.msText, p.marks)
      : await gradeTextAnswer(p.msText, p.userAnswer, p.marks)
    return { label: p.label, result }
  }))

  const totalScore = partResults.reduce((s, p) => s + p.result.score, 0)
  const totalMax   = parts.reduce((s, p) => s + p.marks, 0)
  const status = totalScore === totalMax ? 'correct' : totalScore > 0 ? 'partial' : 'incorrect'

  return {
    status,
    correct: status === 'correct' ? true : status === 'incorrect' ? false : null,
    score: totalScore,
    maxScore: totalMax,
    gradingType: 'ai_rubric',
    criterionScores: Object.fromEntries(partResults.map(p => [p.label, p.result.score])),
    partFeedbacks: Object.fromEntries(partResults.map(p => [p.label, p.result.feedback ?? ''])),
  }
}

export async function POST(req: NextRequest) {
  let body: GradeCloudPayload
  try {
    body = await req.json() as GradeCloudPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { userAnswer, isMcq, msText, msMarks, canvasBase64, parts } = body

  // Multipart: grade each part independently
  if (parts && parts.length >= 2) {
    const result = await gradeMultipart(parts)
    return NextResponse.json(result)
  }

  if (!userAnswer?.trim() && !canvasBase64) {
    return NextResponse.json({ error: 'userAnswer or canvasBase64 is required' }, { status: 400 })
  }

  if (isMcq) {
    return NextResponse.json(gradeMcqCloud(userAnswer, msText, msMarks))
  }

  const maxScore = msMarks ?? 0

  if (canvasBase64) {
    const result = await gradeHandwrittenAnswer(canvasBase64, msText ?? '', maxScore)
    return NextResponse.json(result)
  }

  const result = await gradeTextAnswer(msText ?? '', userAnswer, maxScore)
  return NextResponse.json(result)
}
