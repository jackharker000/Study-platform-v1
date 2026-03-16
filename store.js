/* ── Session Store (localStorage) ─────────────────────────────── */

const INDEX_KEY = 'rp-sessions';

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function sessionKey(id) { return `rp-session-${id}`; }

function readIndex() {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]'); } catch { return []; }
}

function writeIndex(ids) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

function readSession(id) {
  try {
    const raw = localStorage.getItem(sessionKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeSession(session) {
  localStorage.setItem(sessionKey(session.id), JSON.stringify(session));
}

/* ── Mistake/Weakness helpers ─────────────────────────────────── */

function getMistakeQuestionIds(subjectId) {
  const sessions = getAllSessions().filter(s => !subjectId || s.subject === subjectId);
  const allAnswers = sessions.flatMap(s => s.answers);
  const qMap = {};
  for (const a of allAnswers) {
    if (!qMap[a.questionId]) qMap[a.questionId] = { ever_correct: false };
    if (a.correct === true) qMap[a.questionId].ever_correct = true;
  }
  return Object.entries(qMap).filter(([, v]) => !v.ever_correct).map(([id]) => id);
}

function getWeakTopics(subjectId) {
  const sessions = getAllSessions().filter(s => !subjectId || s.subject === subjectId);
  const allAnswers = sessions.flatMap(s => s.answers);
  if (allAnswers.length === 0) return [];
  const topicMap = {};
  for (const a of allAnswers) {
    topicMap[a.topic] = topicMap[a.topic] || { correct: 0, total: 0 };
    topicMap[a.topic].total++;
    if (a.correct === true) topicMap[a.topic].correct++;
  }
  return Object.entries(topicMap)
    .filter(([, v]) => v.total >= 2 && v.correct / v.total < 0.7)
    .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
    .map(([topic]) => topic);
}

/* ── Public API ───────────────────────────────────────────────── */

function createSession({ subject, mode, filters, count }) {
  let pool;

  if (mode === 'mistakes') {
    const mistakeIds = getMistakeQuestionIds(subject);
    if (mistakeIds.length > 0) {
      pool = QUESTIONS.filter(q => mistakeIds.includes(q.id) && (!subject || q.subject === subject));
    }
  } else if (mode === 'weakness') {
    const weakTopics = getWeakTopics(subject);
    if (weakTopics.length > 0) {
      pool = filterQuestions(subject, { ...filters, topic: weakTopics[0] });
      if (pool.length === 0) pool = null;
    }
  }

  if (!pool) pool = filterQuestions(subject, filters);
  if (pool.length === 0) return { error: 'No questions match the selected filters.' };

  const allCards = shuffleArray([...pool]);
  const selected = mode === 'flashcard' ? allCards : allCards.slice(0, count);

  const session = {
    id: uid(),
    subject,
    mode,
    filters,
    questionIds: selected.map(q => q.id),
    questions: selected,
    currentIdx: 0,
    status: 'active',
    answers: [],
    createdAt: new Date().toISOString(),
  };

  writeSession(session);
  writeIndex([session.id, ...readIndex()]);
  return session;
}

function getSession(id) {
  return readSession(id);
}

/* ── Custom question library ──────────────────────────────────── */

const CUSTOM_Q_KEY = 'rp-custom-questions';

function getCustomQuestions() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_Q_KEY) || '[]'); } catch { return []; }
}

function saveCustomQuestion(q) {
  const existing = getCustomQuestions().filter(e => e.id !== q.id);
  localStorage.setItem(CUSTOM_Q_KEY, JSON.stringify([q, ...existing]));
  QUESTION_MAP[q.id] = q;
  if (!QUESTIONS.find(x => x.id === q.id)) QUESTIONS.push(q);
}

function deleteCustomQuestion(id) {
  localStorage.setItem(CUSTOM_Q_KEY, JSON.stringify(getCustomQuestions().filter(q => q.id !== id)));
  delete QUESTION_MAP[id];
  const idx = QUESTIONS.findIndex(q => q.id === id);
  if (idx >= 0) QUESTIONS.splice(idx, 1);
}

function loadCustomQuestions() {
  for (const q of getCustomQuestions()) {
    QUESTION_MAP[q.id] = q;
    if (!QUESTIONS.find(x => x.id === q.id)) QUESTIONS.push(q);
  }
}

/* ── Submit answer (accepts optional pre-computed gradeResult) ── */

function submitAnswer({ sessionId, questionId, userAnswer, confidence, timeMs, gradeResult: preGrade }) {
  const session = readSession(sessionId);
  if (!session) return { error: 'Session not found.' };

  const question = QUESTION_MAP[questionId];
  if (!question) return { error: 'Question not found.' };

  const gradeResult = preGrade || gradeAnswer(question, userAnswer);

  const answer = {
    id: uid(),
    sessionId,
    questionId,
    subject: question.subject,
    topic: question.topic,
    difficulty: question.difficulty,
    qType: question.questionType,
    userAnswer,
    correct: gradeResult.correct,
    score: gradeResult.score,
    maxScore: gradeResult.maxScore,
    confidence: confidence || null,
    timeMs: timeMs || null,
    gradingType: gradeResult.gradingType,
    gradeResult,
    createdAt: new Date().toISOString(),
  };

  const nextIdx = Math.min(session.currentIdx + 1, session.questionIds.length);
  session.answers.push(answer);
  session.currentIdx = nextIdx;
  session.status = nextIdx >= session.questionIds.length ? 'completed' : 'active';
  writeSession(session);

  return { gradeResult, answer };
}

function getAllSessions() {
  return readIndex()
    .map(id => readSession(id))
    .filter(s => s !== null);
}

function clearAllData() {
  const ids = readIndex();
  ids.forEach(id => localStorage.removeItem(sessionKey(id)));
  localStorage.removeItem(INDEX_KEY);
}

function computeDashboard() {
  const sessions = getAllSessions();
  const allAnswers = sessions.flatMap(s => s.answers);

  const total = allAnswers.length;
  const correct = allAnswers.filter(a => a.correct === true).length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  // By subject
  const subjectMap = {};
  for (const a of allAnswers) {
    subjectMap[a.subject] = subjectMap[a.subject] || { correct: 0, total: 0 };
    subjectMap[a.subject].total++;
    if (a.correct === true) subjectMap[a.subject].correct++;
  }
  const bySubject = Object.entries(subjectMap).map(([subjectId, s]) => ({
    subjectId,
    correct: s.correct,
    total: s.total,
    pct: Math.round((s.correct / s.total) * 100),
  }));

  // By topic
  const topicMap = {};
  for (const a of allAnswers) {
    topicMap[a.topic] = topicMap[a.topic] || { correct: 0, total: 0 };
    topicMap[a.topic].total++;
    if (a.correct === true) topicMap[a.topic].correct++;
  }
  const byTopic = Object.entries(topicMap).map(([topic, s]) => ({
    topic,
    correct: s.correct,
    total: s.total,
    pct: Math.round((s.correct / s.total) * 100),
  }));
  const weakTopics = byTopic
    .filter(t => t.total >= 2)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 6);

  // Mistakes count
  const mistakeCount = Object.values(
    allAnswers.reduce((acc, a) => {
      if (!acc[a.questionId]) acc[a.questionId] = { ever_correct: false };
      if (a.correct === true) acc[a.questionId].ever_correct = true;
      return acc;
    }, {})
  ).filter(v => !v.ever_correct).length;

  const recentAnswers = [...allAnswers].reverse().slice(0, 20);

  return { overall: { correct, total, pct }, bySubject, byTopic, weakTopics, recentAnswers, mistakeCount };
}
