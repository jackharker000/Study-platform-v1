/* ── WebLLM — fully in-browser AI, no API key ──────────────────── */
/* DeepSeek R1 Distill Llama 8B via WebGPU (MLC)                   */

const WEBLLM_MODEL = 'DeepSeek-R1-Distill-Llama-8B-q4f32_1-MLC';
const WEBLLM_CDN   = 'https://esm.run/@mlc-ai/web-llm';

/* Engine state --------------------------------------------------- */
let __engine   = null;
let __loading  = false;
let __progress = 0;
let __status   = 'idle'; // idle | loading | ready | error | no-gpu

function webllmReady()    { return __status === 'ready'; }
function webllmLoading()  { return __status === 'loading'; }
function webllmStatus()   { return __status; }
function webllmProgress() { return __progress; }
function getWebLLMEngine(){ return __engine; }
function setWebLLMEngine(e){ __engine = e; }

/* ── Broadcast status to data-ai-* elements ─────────────────────── */
function _broadcast(text, pct) {
  document.querySelectorAll('[data-ai-status]').forEach(el => { el.textContent = text; });
  document.querySelectorAll('[data-ai-progress]').forEach(el => { el.style.width = pct + '%'; });
  document.querySelectorAll('[data-ai-pct]').forEach(el => { el.textContent = pct + '%'; });
  if (__status === 'ready') {
    document.querySelectorAll('[data-ai-hide-when-ready]').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('[data-ai-show-when-ready]').forEach(el => el.classList.remove('hidden'));
  }
}

/* ── Auto-load on DOM ready ──────────────────────────────────────── */
async function _startLoading() {
  if (__loading || __engine) return;
  if (!navigator.gpu) {
    __status = 'no-gpu';
    _broadcast('AI unavailable — needs Chrome/Edge 113+ with GPU', 0);
    document.dispatchEvent(new CustomEvent('webllm-status', { detail: { status: 'no-gpu' } }));
    return;
  }
  __loading = true;
  __status  = 'loading';
  _broadcast('Loading AI model…', 0);
  try {
    const { CreateMLCEngine } = await import(WEBLLM_CDN);
    __engine = await CreateMLCEngine(WEBLLM_MODEL, {
      initProgressCallback(p) {
        __progress = p.progress || 0;
        const pct  = Math.round(__progress * 100);
        _broadcast(p.text ? `AI: ${p.text}` : `Loading AI… ${pct}%`, pct);
        document.dispatchEvent(new CustomEvent('webllm-progress', { detail: { progress: __progress, text: p.text } }));
      },
    });
    __status   = 'ready';
    __progress = 1;
    __loading  = false;
    _broadcast('AI ready', 100);
    document.dispatchEvent(new CustomEvent('webllm-ready'));
  } catch(e) {
    __status  = 'error';
    __loading = false;
    _broadcast('AI failed to load', 0);
    console.error('[WebLLM]', e);
    document.dispatchEvent(new CustomEvent('webllm-status', { detail: { status: 'error', message: e.message } }));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _startLoading);
} else {
  _startLoading();
}

/* ── Wait for engine (used by callAI) ───────────────────────────── */
function waitForEngine(timeoutMs = 600000) {
  if (__engine) return Promise.resolve(__engine);
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('AI model timed out.')), timeoutMs);
    document.addEventListener('webllm-ready', () => { clearTimeout(t); resolve(__engine); }, { once: true });
    document.addEventListener('webllm-status', e => {
      if (e.detail.status === 'error' || e.detail.status === 'no-gpu') {
        clearTimeout(t);
        reject(new Error(e.detail.message || 'AI not available.'));
      }
    }, { once: true });
  });
}

/* ── Core callAI ─────────────────────────────────────────────────── */
async function callAI(messages) {
  const engine = __engine || await waitForEngine();
  const reply  = await engine.chat.completions.create({
    messages,
    temperature: 0.35,
    max_tokens: 4096,
  });
  return reply.choices?.[0]?.message?.content || '';
}

function hasApiKey() { return webllmReady(); }

/* ── JSON parsing — strips <think> + fences ─────────────────────── */
function parseJson(raw) {
  let s = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('{'), end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1) s = s.slice(start, end + 1);
  return JSON.parse(s);
}

/* ── AI grading ──────────────────────────────────────────────────── */
async function gradeWithAI(question, userAnswer) {
  const scheme = (question.markScheme || []).join('\n');
  const messages = [
    { role: 'system', content: `You are a Cambridge exam marker. Grade strictly against the mark scheme.
Respond ONLY with JSON: {"score":<int>,"maxScore":<int>,"feedback":"<text>","strengths":["..."],"missingPoints":["..."]}` },
    { role: 'user', content: `Question (${question.marks} marks): ${question.prompt}\n\nMark scheme:\n${scheme}\n\nStudent answer:\n${userAnswer}` },
  ];
  const raw    = await callAI(messages);
  const result = parseJson(raw);
  return {
    score:         Math.min(result.score ?? 0, question.marks),
    maxScore:      question.marks,
    percentage:    Math.round(((result.score ?? 0) / question.marks) * 100),
    feedback:      result.feedback      || 'No feedback provided.',
    strengths:     result.strengths     || [],
    missingPoints: result.missingPoints || [],
    gradedByAI:    true,
  };
}

/* ── Question generation ─────────────────────────────────────────── */
async function generateQuestions({ subject, topic, difficulty, questionType, count }) {
  const subjectName = (typeof SUBJECT_MAP !== 'undefined' && SUBJECT_MAP[subject]?.name) || subject;
  const mcqExtra  = questionType === 'mcq'         ? '"options":["A","B","C","D"],"correctAnswer":<0-3>,' : '';
  const calcExtra = questionType === 'calculation'  ? '"correctAnswer":"<value with units>",' : '';
  const messages = [
    { role: 'system', content: `You are an expert Cambridge exam question writer.
Generate exactly ${count} ${difficulty} ${questionType} question(s) for ${subjectName} on "${topic}".
Respond ONLY with a JSON array. Each element: {"prompt":"...","questionType":"${questionType}","difficulty":"${difficulty}","marks":<int>,"topic":"${topic}","subject":"${subject}",${mcqExtra}${calcExtra}"markScheme":["..."],"explanation":"...","tags":["..."]}` },
    { role: 'user', content: `Generate ${count} ${difficulty} ${questionType} question(s) about "${topic}" for ${subjectName}.` },
  ];
  const raw = await callAI(messages);
  let parsed;
  try {
    let s = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1].trim();
    const a = s.indexOf('['), b = s.lastIndexOf(']');
    parsed = JSON.parse(a !== -1 && b !== -1 ? s.slice(a, b + 1) : s);
  } catch(e) {
    throw new Error('AI returned invalid JSON. Try again.');
  }
  return parsed.map((q, i) => ({
    id: `ai_${Date.now()}_${i}`, subject, topic: q.topic || topic, subtopic: q.topic || topic,
    questionType: q.questionType || questionType, difficulty: q.difficulty || difficulty,
    marks: q.marks || 3, prompt: q.prompt, options: q.options, correctAnswer: q.correctAnswer,
    markScheme: q.markScheme || [], explanation: q.explanation || '',
    tags: [...(q.tags || []), 'ai-generated'],
  }));
}

/* ── Past paper import ───────────────────────────────────────────── */
async function importFromPastPaper({ subject, paperText, markSchemeText }) {
  const subjectName = (typeof SUBJECT_MAP !== 'undefined' && SUBJECT_MAP[subject]?.name) || subject;
  const messages = [
    { role: 'system', content: `You are an expert at parsing Cambridge exam papers.
Extract all questions from the paper and match with the mark scheme.
Respond ONLY with a JSON array. Each: {"prompt":"...","questionType":"mcq"|"short-answer"|"calculation"|"essay","difficulty":"easy"|"medium"|"hard","marks":<int>,"topic":"<topic>","markScheme":["..."],"explanation":"...","tags":["past-paper"]}` },
    { role: 'user', content: `Subject: ${subjectName}\n\nQUESTION PAPER:\n${paperText}\n\n${markSchemeText ? `MARK SCHEME:\n${markSchemeText}` : '(No mark scheme)'}` },
  ];
  const raw = await callAI(messages);
  let parsed;
  try {
    let s = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1].trim();
    const a = s.indexOf('['), b = s.lastIndexOf(']');
    parsed = JSON.parse(a !== -1 && b !== -1 ? s.slice(a, b + 1) : s);
  } catch(e) {
    throw new Error('AI returned invalid JSON. Try again or check the paper text.');
  }
  return parsed.map((q, i) => ({
    id: `pp_${Date.now()}_${i}`, subject, topic: q.topic || 'Past Paper', subtopic: q.topic || 'Past Paper',
    questionType: q.questionType || 'short-answer', difficulty: q.difficulty || 'medium',
    marks: q.marks || 3, prompt: q.prompt, markScheme: q.markScheme || [],
    explanation: q.explanation || '', tags: [...(q.tags || []), 'past-paper'],
  }));
}

/* ── AI chat with subject context ────────────────────────────────── */
async function chatWithAI(conversationHistory, subjectId, extraContext) {
  const syllabusCtx = (subjectId && typeof getSubjectSyllabusContext === 'function')
    ? getSubjectSyllabusContext(subjectId) : '';
  const systemContent = [
    'You are a knowledgeable and supportive Cambridge exam tutor.',
    'Help students understand topics, work through mistakes, and prepare for exams.',
    'Be clear, concise, and encouraging. Use examples and step-by-step explanations.',
    syllabusCtx ? `\n\nSubject context:\n${syllabusCtx}` : '',
    extraContext  ? `\n\nExtra context:\n${extraContext}` : '',
  ].filter(Boolean).join('\n');
  return callAI([{ role: 'system', content: systemContent }, ...conversationHistory]);
}

/* ── Kept for compatibility with generate.html ───────────────────── */
const WEBLLM_MODELS = [
  { id: 'DeepSeek-R1-Distill-Llama-8B-q4f32_1-MLC',  label: 'DeepSeek R1 Distill Llama 8B  (~5 GB)' },
  { id: 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC',   label: 'DeepSeek R1 Distill Qwen 7B   (~4 GB)' },
  { id: 'DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC', label: 'DeepSeek R1 Distill Qwen 1.5B (~1 GB)' },
];
function loadWebLLMModel(modelId, onProgress) {
  // Redirect to the auto-loader; if a different model is needed, note it
  if (modelId === WEBLLM_MODEL && __engine) return Promise.resolve(__engine);
  return _startLoading();
}
function getProvider()  { return 'webllm'; }
function getModel()     { return WEBLLM_MODEL; }
function getApiKey()    { return ''; }
function setProvider()  {}
function setModel()     {}
function setApiKey()    {}
