import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SUBJECTS } from '@/data/subjects'

export async function GET() {
  try {
    const allAnswers = await prisma.answer.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Overall stats
    const total = allAnswers.length
    const correct = allAnswers.filter(a => a.correct === true).length

    // By subject
    const bySubject = SUBJECTS.map(s => {
      const subAnswers = allAnswers.filter(a => a.subject === s.id)
      const subCorrect = subAnswers.filter(a => a.correct === true).length
      return {
        subjectId: s.id,
        correct: subCorrect,
        total: subAnswers.length,
        pct: subAnswers.length > 0 ? Math.round((subCorrect / subAnswers.length) * 100) : 0,
      }
    }).filter(s => s.total > 0)

    // By topic
    const topicMap: Record<string, { correct: number; total: number }> = {}
    for (const a of allAnswers) {
      if (!topicMap[a.topic]) topicMap[a.topic] = { correct: 0, total: 0 }
      topicMap[a.topic]!.total++
      if (a.correct === true) topicMap[a.topic]!.correct++
    }

    const byTopic = Object.entries(topicMap)
      .map(([topic, stats]) => ({
        topic,
        correct: stats.correct,
        total: stats.total,
        pct: Math.round((stats.correct / stats.total) * 100),
      }))
      .filter(t => t.total >= 2)
      .sort((a, b) => a.pct - b.pct)

    // "Active mistakes" = questions answered wrong in the last 30 days with no subsequent correct answer
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentAnswers = allAnswers.filter(a => new Date(a.createdAt) > thirtyDaysAgo)
    const latestByQuestion: Record<string, boolean> = {}
    for (const a of [...recentAnswers].reverse()) {
      if (a.correct !== null) latestByQuestion[a.questionId] = a.correct === true
    }
    const mistakeCount = Object.values(latestByQuestion).filter(v => !v).length

    return NextResponse.json({
      overall: { correct, total, pct: total > 0 ? Math.round((correct / total) * 100) : 0 },
      bySubject,
      byTopic,
      weakTopics: byTopic.slice(0, 5),
      recentAnswers: allAnswers.slice(0, 20),
      mistakeCount,
    })
  } catch (err) {
    console.error('[dashboard]', err)
    return NextResponse.json({ error: 'Failed to load dashboard.' }, { status: 500 })
  }
}
