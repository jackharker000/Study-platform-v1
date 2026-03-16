import type { Question, GradeResult } from '@/types'

// Parse a number from strings like "375000", "375 kJ", "1/6", "0.050 mol"
function parseNumeric(raw: string): number | null {
  const s = raw.trim()
  // Handle fractions like "1/6"
  const fracMatch = s.match(/^(-?\d+)\s*\/\s*(\d+)$/)
  if (fracMatch) {
    const n = parseFloat(fracMatch[1]!)
    const d = parseFloat(fracMatch[2]!)
    return d !== 0 ? n / d : null
  }
  // Strip units and commas, then parse
  const stripped = s.replace(/[^0-9.\-eE]/g, '')
  const n = parseFloat(stripped)
  return isNaN(n) ? null : n
}

function relativeError(a: number, b: number): number {
  if (b === 0) return a === 0 ? 0 : Infinity
  return Math.abs(a - b) / Math.abs(b)
}

export function gradeCalculation(question: Question, userAnswer: string): GradeResult {
  const expected = String(question.correctAnswer ?? '')
  const userNum = parseNumeric(userAnswer)
  const expectedNum = parseNumeric(expected)

  let correct = false
  if (userNum !== null && expectedNum !== null) {
    // Accept within 1% relative error OR within small absolute tolerance
    const rel = relativeError(userNum, expectedNum)
    const abs = Math.abs(userNum - expectedNum)
    correct = rel < 0.01 || abs < 1e-9
  } else {
    // Fallback: normalised string match
    correct = userAnswer.toLowerCase().replace(/\s/g, '').includes(
      expected.toLowerCase().replace(/\s/g, ''),
    )
  }

  // Partial credit: if mark scheme exists, award 1 mark for showing correct method
  const hasWorkingShown = /[=×÷+\-\/\^]/.test(userAnswer) || userAnswer.length > 4
  const score = correct
    ? question.marks
    : (question.marks > 1 && question.aiMarkable && hasWorkingShown ? 1 : 0)

  return {
    status: correct ? 'correct' : score > 0 ? 'partial' : 'incorrect',
    correct,
    score,
    maxScore: question.marks,
    gradingType: 'auto',
    feedback: correct
      ? `Correct! ${question.explanation}`
      : `Expected: ${expected}. ${question.explanation}`,
    strengths: correct ? ['Correct numerical answer'] : (score > 0 ? ['Working shown — method mark awarded'] : []),
    missingPoints: correct
      ? []
      : [`Expected answer: ${expected}`, ...(question.teachingSteps ?? []).slice(0, 2)],
    nextTarget: correct
      ? 'Try a harder question on this topic.'
      : `Review the steps: ${question.teachingSteps?.[0] ?? ''}`,
  }
}
