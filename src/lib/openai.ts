import OpenAI from 'openai'
import type { Question } from '@/types'
import { buildEssayGradePrompt, parseAiGradeResponse } from './grading'
import type { GradeResult } from '@/types'

let _client: OpenAI | null = null

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured')
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

// JSON schema for grading response
const GRADE_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'number' },
    maxScore: { type: 'number' },
    criterionScores: { type: 'object', additionalProperties: { type: 'number' } },
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    feedback: { type: 'string' },
    nextTarget: { type: 'string' },
  },
  required: ['score', 'maxScore', 'criterionScores', 'strengths', 'weaknesses', 'feedback'],
  additionalProperties: false,
}

export async function gradeWithAI(question: Question, userAnswer: string): Promise<GradeResult> {
  const client = getClient()
  const payload = buildEssayGradePrompt(question, userAnswer)

  const systemPrompt = `You are an expert exam marker for ${question.syllabus} ${question.subject} (${question.level} level).
Grade the student response strictly according to the rubric and mark scheme provided.
Return ONLY a valid JSON object matching the required schema — no prose outside the JSON.`

  const userPrompt = `Question: ${payload.question}

Rubric criteria:
${payload.rubric.criteria.map(c => `- ${c.name}: max ${c.max} marks`).join('\n')}

Mark scheme points:
${payload.markScheme.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Student response:
"""
${payload.studentResponse}
"""

Grade this response and return JSON.`

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'grade_response',
        strict: true,
        schema: GRADE_SCHEMA,
      },
    },
  })

  const text = response.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(text) as Record<string, unknown>
  return parseAiGradeResponse(parsed, question)
}

export async function isAIAvailable(): Promise<boolean> {
  return Boolean(process.env.OPENAI_API_KEY)
}
