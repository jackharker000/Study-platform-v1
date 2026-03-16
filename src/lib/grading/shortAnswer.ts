import type { Question, GradeResult } from '@/types'

// Key-point matching: does the answer contain enough mark-scheme points?
function countMarkPoints(userAnswer: string, markScheme: string[]): number {
  const lower = userAnswer.toLowerCase()
  let count = 0
  for (const point of markScheme) {
    // Extract keywords from the mark-scheme point (words > 3 chars, ignoring [N] notation)
    const keywords = point
      .replace(/\[\d+\]/, '')
      .toLowerCase()
      .split(/[\s,./;:]+/)
      .filter(w => w.length > 3)
    const matchedKeywords = keywords.filter(kw => lower.includes(kw))
    // Award this point if ≥ half the keywords match
    if (keywords.length > 0 && matchedKeywords.length / keywords.length >= 0.5) {
      count++
    }
  }
  return count
}

export function gradeShortAnswer(question: Question, userAnswer: string): GradeResult {
  const lower = userAnswer.toLowerCase().trim()

  // If a specific correct answer is given (e.g. "3:1", "f(x) ≥ 3")
  if (question.correctAnswer && typeof question.correctAnswer === 'string') {
    const expectedLower = question.correctAnswer.toLowerCase()
    const isExact = lower.includes(expectedLower) || expectedLower.includes(lower)
    if (isExact) {
      return {
        status: 'correct', correct: true,
        score: question.marks, maxScore: question.marks,
        gradingType: 'auto',
        feedback: `Correct! ${question.explanation}`,
        strengths: ['Answer matches expected response'],
        missingPoints: [],
      }
    }
  }

  // Mark-scheme based partial credit
  if (question.markScheme && question.markScheme.length > 0) {
    const awarded = countMarkPoints(userAnswer, question.markScheme)
    const score = Math.min(awarded, question.marks)
    const isCorrect = score === question.marks
    const isPartial = score > 0 && !isCorrect

    return {
      status: isCorrect ? 'correct' : isPartial ? 'partial' : 'incorrect',
      correct: isCorrect,
      score,
      maxScore: question.marks,
      gradingType: 'auto',
      feedback: isCorrect
        ? `Well done! ${question.explanation}`
        : `You scored ${score}/${question.marks}. ${question.explanation}`,
      strengths: score > 0 ? [`${score} mark point(s) identified`] : [],
      missingPoints: question.markScheme
        .slice(score)
        .map(p => p.replace(/\[\d+\]/, '').trim()),
      nextTarget: isCorrect
        ? 'Excellent — try a harder question.'
        : `Target ${score + 1}/${question.marks}: ${question.markScheme[score] ?? ''}`,
    }
  }

  // No mark scheme — send to AI grading (return ungraded)
  return {
    status: 'ungraded', correct: null,
    score: 0, maxScore: question.marks,
    gradingType: 'ungraded',
    feedback: 'This response requires AI-assisted marking. Use the "Grade with AI" button.',
    strengths: [],
    missingPoints: [],
  }
}
