import type { Question, GradeResult } from '@/types'

export function gradeMcq(question: Question, userAnswer: string): GradeResult {
  const selected = parseInt(userAnswer, 10)
  const correct = selected === question.correctAnswer

  return {
    status: correct ? 'correct' : 'incorrect',
    correct,
    score: correct ? question.marks : 0,
    maxScore: question.marks,
    gradingType: 'auto',
    feedback: correct
      ? `Correct! ${question.explanation}`
      : `Incorrect. The correct answer is ${question.options![question.correctAnswer as number]}. ${question.explanation}`,
    strengths: correct ? ['Selected the correct answer'] : [],
    missingPoints: correct ? [] : [`Correct answer: ${question.options![question.correctAnswer as number]}`],
  }
}
