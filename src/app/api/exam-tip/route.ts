import { NextRequest, NextResponse } from 'next/server'
import { callAI, selectTextModel, extractText } from '@/lib/ai-providers'
import { generateExamTip } from '@/lib/grading'

export const dynamic = 'force-dynamic'

interface TipPayload {
  msText?: string | null
  userAnswer?: string | null
  isMcq?: boolean
  msMarks?: number | null
  score?: number | null
  maxScore?: number | null
}

export async function POST(req: NextRequest) {
  let body: TipPayload
  try {
    body = await req.json() as TipPayload
  } catch {
    return NextResponse.json({ tip: null }, { status: 400 })
  }

  const { msText, userAnswer, isMcq, msMarks, score, maxScore } = body

  if (!msText || !userAnswer) {
    const fallback = generateExamTip(isMcq ? 'mcq' : 'short-answer')
    return NextResponse.json({ tip: fallback })
  }

  try {
    const tier = selectTextModel(msMarks ?? null, isMcq ?? false)
    const response = await callAI(tier, [
      {
        role: 'system',
        content:
          'You are a Cambridge examiner giving a targeted exam tip. ' +
          'Based on the student\'s specific answer and the mark scheme, give exactly one actionable improvement tip in 1-2 sentences. ' +
          'Be specific to what they wrote — not generic advice. ' +
          'Respond with only the tip text, no preamble or formatting.',
      },
      {
        role: 'user',
        content:
          `Mark scheme:\n${msText}\n\n` +
          `Student scored ${score ?? '?'}/${maxScore ?? '?'} marks.\n` +
          `Student wrote: ${userAnswer}\n\n` +
          'Give one specific improvement tip.',
      },
    ], { temperature: 0.3, max_tokens: 120 })

    const tip = extractText(response).trim()
    return NextResponse.json({ tip: tip || null })
  } catch (err) {
    console.error('[exam-tip] error:', err)
    const fallback = generateExamTip(isMcq ? 'mcq' : 'short-answer')
    return NextResponse.json({ tip: fallback })
  }
}
