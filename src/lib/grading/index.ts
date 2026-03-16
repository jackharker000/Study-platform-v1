import type { Question, GradeResult } from '@/types'
import { gradeMcq } from './mcq'
import { gradeCalculation } from './calculation'
import { gradeShortAnswer } from './shortAnswer'
import { gradeEssayHeuristic } from './essay'

export { gradeMcq, gradeCalculation, gradeShortAnswer, gradeEssayHeuristic }
export { buildEssayGradePrompt, parseAiGradeResponse } from './essay'

export function gradeAnswer(question: Question, userAnswer: string): GradeResult {
  switch (question.questionType) {
    case 'mcq':
      return gradeMcq(question, userAnswer)
    case 'calculation':
      return gradeCalculation(question, userAnswer)
    case 'short-answer':
      return gradeShortAnswer(question, userAnswer)
    case 'essay':
      return gradeEssayHeuristic(question, userAnswer)
    default:
      return {
        status: 'ungraded', correct: null,
        score: 0, maxScore: question.marks,
        gradingType: 'ungraded',
        feedback: 'Unknown question type.',
        strengths: [], missingPoints: [],
      }
  }
}

export function generateExamTip(questionType: string): string {
  const tips: Record<string, string> = {
    mcq: 'Eliminate obviously wrong answers first. If two options look similar, one is likely correct.',
    calculation: 'Always show your working — partial marks are awarded even if the final answer is wrong.',
    'short-answer': 'Use the mark allocation as a guide: 3 marks = 3 distinct points.',
    essay: 'Plan before writing. Use PEE paragraphs (Point, Evidence, Explanation) and link back to the question.',
  }
  return tips[questionType] ?? 'Read the question carefully and check your answer before moving on.'
}
