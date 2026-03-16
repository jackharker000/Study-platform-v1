/* ── Grading Logic ─────────────────────────────────────────────── */

function gradeMcq(question, userAnswer) {
  const selected = parseInt(userAnswer, 10);
  const correct = selected === question.correctAnswer;
  return {
    status: correct ? 'correct' : 'incorrect',
    correct,
    score: correct ? question.marks : 0,
    maxScore: question.marks,
    gradingType: 'auto',
    feedback: correct
      ? `Correct! ${question.explanation}`
      : `Incorrect. The correct answer is ${question.options[question.correctAnswer]}. ${question.explanation}`,
    strengths: correct ? ['Selected the correct answer'] : [],
    missingPoints: correct ? [] : [`Correct answer: ${question.options[question.correctAnswer]}`],
  };
}

function parseNumeric(raw) {
  const s = raw.trim();
  const fracMatch = s.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const n = parseFloat(fracMatch[1]);
    const d = parseFloat(fracMatch[2]);
    return d !== 0 ? n / d : null;
  }
  const stripped = s.replace(/[^0-9.\-eE]/g, '');
  const n = parseFloat(stripped);
  return isNaN(n) ? null : n;
}

function relativeError(a, b) {
  if (b === 0) return a === 0 ? 0 : Infinity;
  return Math.abs(a - b) / Math.abs(b);
}

function gradeCalculation(question, userAnswer) {
  const expected = String(question.correctAnswer || '');
  const userNum = parseNumeric(userAnswer);
  const expectedNum = parseNumeric(expected);

  let correct = false;
  if (userNum !== null && expectedNum !== null) {
    const rel = relativeError(userNum, expectedNum);
    const abs = Math.abs(userNum - expectedNum);
    correct = rel < 0.01 || abs < 1e-9;
  } else {
    correct = userAnswer.toLowerCase().replace(/\s/g, '').includes(
      expected.toLowerCase().replace(/\s/g, '')
    );
  }

  const hasWorkingShown = /[=×÷+\-\/\^]/.test(userAnswer) || userAnswer.length > 4;
  const score = correct
    ? question.marks
    : (question.marks > 1 && question.aiMarkable && hasWorkingShown ? 1 : 0);

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
      : [`Expected answer: ${expected}`, ...(question.teachingSteps || []).slice(0, 2)],
  };
}

function countMarkPoints(userAnswer, markScheme) {
  const lower = userAnswer.toLowerCase();
  let count = 0;
  for (const point of markScheme) {
    const keywords = point
      .replace(/\[\d+\]/, '')
      .toLowerCase()
      .split(/[\s,./;:]+/)
      .filter(w => w.length > 3);
    const matched = keywords.filter(kw => lower.includes(kw));
    if (keywords.length > 0 && matched.length / keywords.length >= 0.5) count++;
  }
  return count;
}

function gradeShortAnswer(question, userAnswer) {
  const lower = userAnswer.toLowerCase().trim();

  if (question.correctAnswer && typeof question.correctAnswer === 'string') {
    const expectedLower = question.correctAnswer.toLowerCase();
    if (lower.includes(expectedLower) || expectedLower.includes(lower)) {
      return {
        status: 'correct', correct: true,
        score: question.marks, maxScore: question.marks,
        gradingType: 'auto',
        feedback: `Correct! ${question.explanation}`,
        strengths: ['Answer matches expected response'],
        missingPoints: [],
      };
    }
  }

  if (question.markScheme && question.markScheme.length > 0) {
    const awarded = countMarkPoints(userAnswer, question.markScheme);
    const score = Math.min(awarded, question.marks);
    const isCorrect = score === question.marks;
    const isPartial = score > 0 && !isCorrect;
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
      missingPoints: question.markScheme.slice(score).map(p => p.replace(/\[\d+\]/, '').trim()),
    };
  }

  return {
    status: 'partial', correct: null,
    score: 0, maxScore: question.marks,
    gradingType: 'ungraded',
    feedback: question.explanation || 'See model answer.',
    strengths: [],
    missingPoints: (question.markScheme || []).map(p => p.replace(/\[\d+\]/, '').trim()),
  };
}

function buildEssayRubric(question) {
  if (question.marks <= 4) {
    return [
      { name: 'knowledge', max: Math.ceil(question.marks * 0.5) },
      { name: 'application', max: Math.floor(question.marks * 0.5) },
    ];
  }
  if (question.marks <= 8) {
    return [
      { name: 'knowledge', max: 2 },
      { name: 'evidence', max: 2 },
      { name: 'analysis', max: Math.floor(question.marks * 0.5) - 2 },
      { name: 'organisation', max: question.marks - 6 },
    ];
  }
  return [
    { name: 'knowledge', max: Math.ceil(question.marks * 0.25) },
    { name: 'evidence', max: Math.ceil(question.marks * 0.25) },
    { name: 'analysis', max: Math.ceil(question.marks * 0.3) },
    { name: 'evaluation', max: Math.floor(question.marks * 0.2) },
  ];
}

function gradeEssayHeuristic(question, userAnswer) {
  const wordCount = userAnswer.trim().split(/\s+/).filter(Boolean).length;
  const lower = userAnswer.toLowerCase();
  const rubric = buildEssayRubric(question);
  const criterionScores = {};
  const strengths = [];
  const missingPoints = [];

  const markKeywords = (question.markScheme || [])
    .flatMap(p => p.toLowerCase().split(/[\s,./;:]+/).filter(w => w.length > 4));
  const keywordsMatched = markKeywords.filter(kw => lower.includes(kw)).length;
  const knowledgeRatio = markKeywords.length > 0 ? keywordsMatched / markKeywords.length : 0.5;

  for (const criterion of rubric) {
    let awarded = 0;
    switch (criterion.name) {
      case 'knowledge':
        awarded = Math.round(criterion.max * Math.min(knowledgeRatio * 1.5, 1));
        if (awarded >= criterion.max) strengths.push('Good subject knowledge demonstrated');
        else missingPoints.push('Include more key terms and subject-specific vocabulary');
        break;
      case 'evidence':
        if (/["'""]/.test(userAnswer) || /for example|such as|e\.g\./i.test(lower)) {
          awarded = criterion.max;
          strengths.push('Evidence and examples included');
        } else {
          awarded = Math.floor(criterion.max * 0.4);
          missingPoints.push('Add specific examples or quotations to support your points');
        }
        break;
      case 'analysis':
        if (/because|therefore|this shows|this suggests|this means|as a result/i.test(lower)) {
          awarded = Math.round(criterion.max * 0.75);
          strengths.push('Analytical connectives used effectively');
        } else {
          awarded = Math.floor(criterion.max * 0.3);
          missingPoints.push("Use 'because', 'therefore', 'this shows' to build analysis");
        }
        break;
      case 'evaluation':
      case 'organisation':
        if (/however|although|on the other hand|conversely|in contrast/i.test(lower)) {
          awarded = criterion.max;
          strengths.push('Balanced argument with counterpoints');
        } else {
          awarded = Math.floor(criterion.max * 0.4);
          missingPoints.push("Add 'however' or 'on the other hand' for a balanced perspective");
        }
        break;
      case 'application':
        awarded = wordCount >= 80 ? criterion.max : Math.floor(criterion.max * (wordCount / 80));
        break;
    }
    criterionScores[criterion.name] = Math.min(awarded, criterion.max);
  }

  if (wordCount < 50) {
    missingPoints.push(`Response too short (${wordCount} words). Aim for at least ${question.marks * 15} words.`);
  } else {
    strengths.push(`Good length: ${wordCount} words`);
  }

  const totalScore = Object.values(criterionScores).reduce((a, b) => a + b, 0);
  const score = Math.min(totalScore, question.marks);
  const pct = question.marks > 0 ? score / question.marks : 0;

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
  };
}

function gradeAnswer(question, userAnswer) {
  switch (question.questionType) {
    case 'mcq':          return gradeMcq(question, userAnswer);
    case 'calculation':  return gradeCalculation(question, userAnswer);
    case 'short-answer': return gradeShortAnswer(question, userAnswer);
    case 'essay':        return gradeEssayHeuristic(question, userAnswer);
    default:
      return {
        status: 'ungraded', correct: null,
        score: 0, maxScore: question.marks,
        gradingType: 'ungraded',
        feedback: 'Unknown question type.',
        strengths: [], missingPoints: [],
      };
  }
}

function generateExamTip(questionType) {
  const tips = {
    mcq: 'Eliminate obviously wrong answers first. If two options look similar, one is likely correct.',
    calculation: 'Always show your working — partial marks are awarded even if the final answer is wrong.',
    'short-answer': 'Use the mark allocation as a guide: 3 marks = 3 distinct points.',
    essay: 'Plan before writing. Use PEE paragraphs (Point, Evidence, Explanation) and link back to the question.',
  };
  return tips[questionType] || 'Read the question carefully and check your answer before moving on.';
}
