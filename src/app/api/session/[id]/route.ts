import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { QUESTION_MAP } from '@/data/questions'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: params.id },
      include: { answers: { orderBy: { createdAt: 'asc' } } },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    const questionIds = JSON.parse(session.questionIds) as string[]
    const questions = questionIds.map(id => QUESTION_MAP[id]).filter(Boolean)

    return NextResponse.json({ session, questions, answers: session.answers })
  } catch (err) {
    console.error('[session/get]', err)
    return NextResponse.json({ error: 'Failed to fetch session.' }, { status: 500 })
  }
}
