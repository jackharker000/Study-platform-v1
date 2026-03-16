/* ── AI Integration (Anthropic Claude API) ────────────────────── */

const AI_KEY_STORAGE = 'rp-ai-key';
const AI_MODEL_GRADE  = 'claude-haiku-4-5-20251001';
const AI_MODEL_GEN    = 'claude-sonnet-4-6';

function getApiKey()      { return localStorage.getItem(AI_KEY_STORAGE) || ''; }
function setApiKey(k)     { localStorage.setItem(AI_KEY_STORAGE, k.trim()); }
function hasApiKey()      { return !!getApiKey(); }

/* ── Core API call ────────────────────────────────────────────── */
async function callClaude(messages, systemPrompt, model = AI_MODEL_GEN) {
  const key = getApiKey();
  if (!key) throw new Error('No API key. Go to the Generate page to add your Anthropic API key.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, max_tokens: 4096, system: systemPrompt, messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

function parseJson(raw) {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

/* ── AI Grading ───────────────────────────────────────────────── */
async function gradeWithAI(question, userAnswer) {
  const subjectInfo = (typeof SUBJECT_MAP !== 'undefined' && SUBJECT_MAP[question.subject]) || {};
  const system = `You are a strict but fair Cambridge exam marker for ${subjectInfo.name || question.subject} (${question.level || subjectInfo.level || ''} level, syllabus ${question.syllabus || subjectInfo.syllabus || ''}). Award marks only for clearly demonstrated understanding.`;

  const markSchemeText = (question.markScheme || []).join('\n') || 'Not provided — use your expert judgment.';

  const prompt = `Question: ${question.prompt}

Marks available: ${question.marks}
Mark scheme:
${markSchemeText}

Student's answer:
${userAnswer}

Award marks precisely. Respond with ONLY valid JSON (no markdown fences):
{
  "score": <integer 0–${question.marks}>,
  "feedback": "<1–2 sentences: what they got right/wrong>",
  "strengths": ["<specific strength>"],
  "missingPoints": ["<specific missing point>"]
}`;

  const raw = await callClaude([{ role: 'user', content: prompt }], system, AI_MODEL_GRADE);
  const parsed = parseJson(raw);

  const score = Math.min(question.marks, Math.max(0, Number(parsed.score) || 0));
  const pct = question.marks > 0 ? score / question.marks : 0;

  return {
    status: pct >= 0.8 ? 'correct' : pct >= 0.4 ? 'partial' : 'incorrect',
    correct: pct >= 0.6,
    score,
    maxScore: question.marks,
    gradingType: 'ai_rubric',
    feedback: parsed.feedback || '',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    missingPoints: Array.isArray(parsed.missingPoints) ? parsed.missingPoints : [],
  };
}

/* ── Question Generation ──────────────────────────────────────── */
async function generateQuestions({ subject, topic, difficulty, questionType, count }) {
  const subjectInfo = (typeof SUBJECT_MAP !== 'undefined' && SUBJECT_MAP[subject]) || {};

  const system = `You are an expert ${subjectInfo.name || subject} exam question writer for ${subjectInfo.level || ''} Cambridge International exams (syllabus ${subjectInfo.syllabus || ''}). Write rigorous, exam-style questions with detailed mark schemes.`;

  const typeHints = {
    mcq: 'Multiple choice: 4 options (A–D). correctAnswer = index 0–3.',
    'short-answer': '3–6 marks. Structured answer requiring key points. correctAnswer = null.',
    calculation: 'Numerical/algebraic problem. correctAnswer = the exact numeric answer as a string (e.g. "375000" or "0.050").',
    essay: '6–12 marks. Extended response. correctAnswer = null.',
  };

  const prompt = `Generate ${count} ${difficulty}-difficulty ${questionType} exam questions on the topic "${topic}" for ${subjectInfo.name || subject}.

${typeHints[questionType] || ''}

Respond with ONLY a valid JSON array (no markdown), each object:
{
  "prompt": "<full question text, may include sub-parts>",
  "questionType": "${questionType}",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "marks": <integer>,
  "options": ${questionType === 'mcq' ? '["option A", "option B", "option C", "option D"]' : 'null'},
  "correctAnswer": <see instructions above>,
  "explanation": "<full explanation of the correct answer>",
  "markScheme": ["<mark point> [1]", ...],
  "teachingSteps": ["<step 1>", "<step 2>", ...]
}`;

  const raw = await callClaude([{ role: 'user', content: prompt }], system, AI_MODEL_GEN);
  const arr = parseJson(raw);

  return arr.map((q, i) => ({
    id: `ai_${subject}_${Date.now()}_${i}`,
    subject,
    level: subjectInfo.level || '',
    syllabus: subjectInfo.syllabus || '',
    paper: 'AI Generated',
    subtopic: topic,
    syllabusRef: '',
    difficultyScore: { easy: 1, medium: 2, hard: 3 }[difficulty] || 2,
    skillsTested: [],
    tags: ['ai-generated'],
    examFrequency: 'medium',
    aiMarkable: true,
    commonMistakes: [],
    ...q,
  }));
}

/* ── Past Paper Import ────────────────────────────────────────── */
async function importFromPastPaper({ subject, paperText, markSchemeText }) {
  const subjectInfo = (typeof SUBJECT_MAP !== 'undefined' && SUBJECT_MAP[subject]) || {};

  const system = `You are an expert at extracting and structuring ${subjectInfo.name || subject} Cambridge exam questions. Preserve the original wording exactly. Infer topics, difficulty, and question type from context.`;

  const prompt = `Extract every question from the following ${subjectInfo.name || subject} past paper and pair each with its mark scheme answer.

PAST PAPER:
${paperText}

MARK SCHEME:
${markSchemeText || '(not provided — infer from the questions)'}

Respond with ONLY a valid JSON array (no markdown), each object:
{
  "prompt": "<exact question wording, including sub-parts>",
  "questionType": "mcq" | "short-answer" | "calculation" | "essay",
  "topic": "<inferred topic>",
  "difficulty": "easy" | "medium" | "hard",
  "marks": <integer from the paper>,
  "options": ["A", "B", "C", "D"] or null,
  "correctAnswer": <0-3 for mcq, numeric string for calculation, null otherwise>,
  "explanation": "<explanation from mark scheme>",
  "markScheme": ["<mark point> [1]", ...],
  "teachingSteps": []
}`;

  const raw = await callClaude([{ role: 'user', content: prompt }], system, AI_MODEL_GEN);
  const arr = parseJson(raw);

  return arr.map((q, i) => ({
    id: `pp_${subject}_${Date.now()}_${i}`,
    subject,
    level: subjectInfo.level || '',
    syllabus: subjectInfo.syllabus || '',
    paper: 'Past Paper',
    subtopic: q.topic || '',
    syllabusRef: '',
    difficultyScore: { easy: 1, medium: 2, hard: 3 }[q.difficulty] || 2,
    skillsTested: [],
    tags: ['past-paper'],
    examFrequency: 'high',
    aiMarkable: true,
    commonMistakes: [],
    ...q,
  }));
}
