import { NextRequest, NextResponse } from 'next/server'
import { QUESTIONS } from '@/data/questions'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const subject = searchParams.get('subject')
  const topic = searchParams.get('topic')
  const paper = searchParams.get('paper')
  const difficulty = searchParams.get('difficulty')
  const questionType = searchParams.get('questionType')
  const query = searchParams.get('query')?.toLowerCase()
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)

  let results = QUESTIONS

  if (subject) results = results.filter(q => q.subject === subject)
  if (topic) results = results.filter(q => q.topic === topic)
  if (paper) results = results.filter(q => q.paper === paper)
  if (difficulty) results = results.filter(q => q.difficulty === difficulty)
  if (questionType) results = results.filter(q => q.questionType === questionType)
  if (query) {
    results = results.filter(
      q =>
        q.prompt.toLowerCase().includes(query) ||
        q.topic.toLowerCase().includes(query) ||
        q.tags.some(t => t.toLowerCase().includes(query)),
    )
  }

  return NextResponse.json({
    questions: results.slice(0, limit),
    total: results.length,
  })
}
