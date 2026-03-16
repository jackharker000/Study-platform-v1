import type { Question, GradeResult } from '@/types'

export interface EssayRubricCriterion {
  name: string
  max: number
}

// Default rubric inferred from question type and marks
function buildRubric(question: Question): EssayRubricCriterion[] {
  if (question.marks <= 4) {
    return [
      { name: 'knowledge', max: Math.ceil(question.marks * 0.5) },
      { name: 'application', max: Math.floor(question.marks * 0.5) },
    ]
  }
  if (question.marks <= 8) {
    return [
      { name: 'knowledge', max: 2 },
      { name: 'evidence', max: 2 },
      { name: 'analysis', max: Math.floor(question.marks * 0.5) - 2 },
      { name: 'organisation', max: question.marks - 6 },
    ]
  }
  return [
    { name: 'knowledge', max: Math.ceil(question.marks * 0.25) },
    { name: 'evidence', max: Math.ceil(question.marks * 0.25) },
    { name: 'analysis', max: Math.ceil(question.marks * 0.3) },
    { name: 'evaluation', max: Math.floor(question.marks * 0.2) },
  ]
}

// Heuristic essay grading — used when no AI available
export function gradeEssayHeuristic(question: Question, userAnswer: string): GradeResult {
  const wordCount = userAnswer.trim().split(/\s+/).filter(Boolean).length
  const lower = userAnswer.toLowerCase()

  const rubric = buildRubric(question)
  const criterionScores: Record<string, number> = {}
  const strengths: string[] = []
  const missingPoints: string[] = []

  // Knowledge: key terms from mark scheme
  const markKeywords = (question.markScheme ?? [])
    .flatMap(p => p.toLowerCase().split(/[\s,./;:]+/).filter(w => w.length > 4))
  const keywordsMatched = markKeywords.filter(kw => lower.includes(kw)).length
  const knowledgeRatio = markKeywords.length > 0 ? keywordsMatched / markKeywords.length : 0.5

  for (const criterion of rubric) {
    let awarded = 0
    switch (criterion.name) {
      case 'knowledge':
        awarded = Math.round(criterion.max * Math.min(knowledgeRatio * 1.5, 1))
        if (awarded >= criterion.max) strengths.push('Good subject knowledge demonstrated')
        else missingPoints.push('Include more key terms and subject-specific vocabulary')
        break
      case 'evidence':
        if (/["'""]/.test(userAnswer) || /for example|such as|e\.g\./i.test(lower)) {
          awarded = criterion.max
          strengths.push('Evidence and examples included')
        } else {
          awarded = Math.floor(criterion.max * 0.4)
          missingPoints.push('Add specific examples or quotations to support your points')
        }
        break
      case 'analysis':
        if (/because|therefore|this shows|this suggests|this means|as a result/i.test(lower)) {
          awarded = Math.round(criterion.max * 0.75)
          strengths.push('Analytical connectives used effectively')
        } else {
          awarded = Math.floor(criterion.max * 0.3)
          missingPoints.push("Use 'because', 'therefore', 'this shows' to build analysis")
        }
        break
      case 'evaluation':
      case 'organisation':
        if (/however|although|on the other hand|conversely|in contrast/i.test(lower)) {
          awarded = criterion.max
          strengths.push('Balanced argument with counterpoints')
        } else {
          awarded = Math.floor(criterion.max * 0.4)
          missingPoints.push("Add 'however' or 'on the other hand' for a balanced perspective")
        }
        break
      case 'application':
        awarded = wordCount >= 80 ? criterion.max : Math.floor(criterion.max * (wordCount / 80))
        break
    }
    criterionScores[criterion.name] = Math.min(awarded, criterion.max)
  }

  if (wordCount < 50) missingPoints.push(`Response too short (${wordCount} words). Aim for at least ${question.marks * 15} words.`)
  else strengths.push(`Good length: ${wordCount} words`)

  const totalScore = Object.values(criterionScores).reduce((a, b) => a + b, 0)
  const score = Math.min(totalScore, question.marks)
  const pct = question.marks > 0 ? score / question.marks : 0

  return {
    status: pct >= 0.8 ? 'correct' : pct >= 0.4 ? 'partial' : 'incorrect',
    correct: pct >= 0.6,
    score,
    maxScore: question.marks,
    gradingType: 'auto',
    criterionScores,
    strengths,
    missingPoints,
    feedback: `Estimated score: ${score}/${question.marks}. ${question.explanation}`,
    nextTarget: score < question.marks
      ? `To reach ${score + 1}/${question.marks}: ${missingPoints[0] ?? 'develop your analysis'}`
      : 'Excellent essay — try a harder question.',
  }
}

// Build the structured prompt payload for AI grading
export function buildEssayGradePrompt(question: Question, userAnswer: string) {
  const rubric = buildRubric(question)
  return {
    question: question.prompt,
    rubric: { criteria: rubric },
    markScheme: question.markScheme ?? [],
    studentResponse: userAnswer,
  }
}

// Parse AI grading JSON response into GradeResult
export function parseAiGradeResponse(
  raw: Record<string, unknown>,
  question: Question,
): GradeResult {
  const score = typeof raw.score === 'number' ? raw.score : 0
  const maxScore = typeof raw.maxScore === 'number' ? raw.maxScore : question.marks
  const pct = maxScore > 0 ? score / maxScore : 0

  return {
    status: pct >= 0.8 ? 'correct' : pct >= 0.4 ? 'partial' : 'incorrect',
    correct: pct >= 0.6,
    score,
    maxScore,
    gradingType: 'ai_rubric',
    criterionScores: (raw.criterionScores as Record<string, number>) ?? {},
    strengths: (raw.strengths as string[]) ?? [],
    missingPoints: (raw.weaknesses as string[]) ?? (raw.missingPoints as string[]) ?? [],
    feedback: typeof raw.feedback === 'string' ? raw.feedback : `Score: ${score}/${maxScore}`,
    nextTarget: typeof raw.nextTarget === 'string' ? raw.nextTarget : undefined,
  }
}
