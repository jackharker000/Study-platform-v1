/* ── Provider config ───────────────────────────────────────────── */

const PROVIDERS = {
  webllm: {
    name: 'In-Browser (WebLLM)',
    url: null,
    defaultModel: 'DeepSeek-R1-Distill-Llama-8B-q4f32_1-MLC',
    needsKey: false,
    note: 'Runs fully in your browser using WebGPU — no API key or internet needed after first load. Requires Chrome/Edge 113+ with a GPU.',
  },
  openrouter: {
    name: 'OpenRouter (Cloud)',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'deepseek/deepseek-r1-distill-qwen-32b',
    needsKey: true,
    note: 'Free tier at openrouter.ai — DeepSeek R1 Distill Qwen 32B in the cloud',
  },
  deepseek: {
    name: 'DeepSeek API',
    url: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-reasoner',
    needsKey: true,
    note: 'DeepSeek R1 via platform.deepseek.com',
  },
  ollama: {
    name: 'Ollama (Local Server)',
    url: 'http://localhost:11434/v1/chat/completions',
    defaultModel: 'deepseek-r1:8b',
    needsKey: false,
    note: 'Run DeepSeek locally via Ollama — start with OLLAMA_ORIGINS=* ollama run deepseek-r1:8b',
  },
};

/* ── WebLLM in-browser engine ─────────────────────────────────── */

const WEBLLM_MODELS = [
  { id: 'DeepSeek-R1-Distill-Llama-8B-q4f32_1-MLC',  label: 'DeepSeek R1 Distill Llama 8B  (~5 GB)' },
  { id: 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC',   label: 'DeepSeek R1 Distill Qwen 7B   (~4 GB)' },
  { id: 'DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC', label: 'DeepSeek R1 Distill Qwen 1.5B (~1 GB) — fastest' },
];

// Loaded engine lives on window so any page can use it after load
function getWebLLMEngine()  { return window.__webllmEngine || null; }
function setWebLLMEngine(e) { window.__webllmEngine = e; }
function webllmReady()      { return !!window.__webllmEngine; }

async function loadWebLLMModel(modelId, onProgress) {
  if (!navigator.gpu) {
    throw new Error('WebGPU is not supported in this browser. Use Chrome 113+ or Edge 113+.');
  }
  // Dynamically import WebLLM from CDN
  const { CreateMLCEngine } = await import('https://esm.run/@mlc-ai/web-llm');
  const engine = await CreateMLCEngine(modelId, {
    initProgressCallback: (p) => {
      if (typeof onProgress === 'function') onProgress(p);
    },
  });
  setWebLLMEngine(engine);
  return engine;
}

const STORAGE_PROVIDER = 'rp-ai-provider';
const STORAGE_KEY      = 'rp-ai-key';
const STORAGE_MODEL    = 'rp-ai-model';

function getProvider()     { return localStorage.getItem(STORAGE_PROVIDER) || 'openrouter'; }
function setProvider(p)    { localStorage.setItem(STORAGE_PROVIDER, p); }
function getApiKey()       { return localStorage.getItem(STORAGE_KEY) || ''; }
function setApiKey(k)      { localStorage.setItem(STORAGE_KEY, k.trim()); }
function getModel()        {
  return localStorage.getItem(STORAGE_MODEL) || PROVIDERS[getProvider()]?.defaultModel || 'deepseek/deepseek-r1-distill-qwen-32b';
}
function setModel(m)       { localStorage.setItem(STORAGE_MODEL, m); }
function hasApiKey() {
  const p = getProvider();
  if (p === 'ollama')  return true;
  if (p === 'webllm')  return webllmReady();
  return !!getApiKey();
}

/* ── Core API call ────────────────────────────────────────────── */
async function callAI(messages, model) {
  const provider = getProvider();

  // ── In-browser WebLLM path ────────────────────────────────────
  if (provider === 'webllm') {
    const engine = getWebLLMEngine();
    if (!engine) throw new Error('Model not loaded yet. Open ✦ AI → Settings and click "Load Model".');
    const reply = await engine.chat.completions.create({
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    });
    const content = reply.choices?.[0]?.message?.content || '';
    if (!content) throw new Error('Empty response from in-browser model.');
    return content;
  }

  // ── HTTP API path (OpenAI-compatible) ─────────────────────────
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new Error('Unknown provider: ' + provider);

  const key = getApiKey();
  if (cfg.needsKey && !key) throw new Error(`No API key set for ${cfg.name}. Add it in ✦ AI → Settings.`);

  const m = model || getModel();

  const headers = { 'Content-Type': 'application/json' };
  if (cfg.needsKey && key) headers['Authorization'] = `Bearer ${key}`;
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = location.href;
    headers['X-Title'] = 'Study Platform';
  }

  const body = { model: m, messages, temperature: 0.3, max_tokens: 4096 };

  const res = await fetch(cfg.url, { method: 'POST', headers, body: JSON.stringify(body) });

  if (!res.ok) {
    let msg = `API error ${res.status}`;
    try { const e = await res.json(); msg = e.error?.message || e.message || msg; } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  // Extract content — handle both standard and reasoning models
  const choice = data.choices?.[0];
  const content = choice?.message?.content || choice?.message?.reasoning_content || '';
  if (!content) throw new Error('Empty response from model');
  return content;
}

function parseJson(raw) {
  // Remove <think>...</think> reasoning blocks from R1 models
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // Remove markdown fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  // Find the first [ or { and parse from there
  const start = cleaned.search(/[[\{]/);
  if (start > 0) cleaned = cleaned.slice(start);
  return JSON.parse(cleaned);
}

/* ── AI Grading ───────────────────────────────────────────────── */
async function gradeWithAI(question, userAnswer) {
  const subjectInfo = (typeof SUBJECT_MAP !== 'undefined' && SUBJECT_MAP[question.subject]) || {};

  const system = {
    role: 'system',
    content: `You are a strict Cambridge exam marker for ${subjectInfo.name || question.subject} (${question.level || ''} level). Award marks only for points that clearly match the mark scheme. Be concise and specific.`,
  };

  const markSchemeText = (question.markScheme || []).join('\n') || 'No mark scheme — use subject expertise.';

  const user = {
    role: 'user',
    content: `QUESTION: ${question.prompt}

MARKS AVAILABLE: ${question.marks}

MARK SCHEME:
${markSchemeText}

STUDENT'S ANSWER:
${userAnswer}

Grade this answer. Respond with ONLY a JSON object (no markdown, no explanation outside JSON):
{"score":${question.marks > 1 ? `<integer 0-${question.marks}>` : '<0 or 1>'},"feedback":"<1-2 sentences on what was right/wrong>","strengths":["<specific point>"],"missingPoints":["<specific missing point>"]}`,
  };

  const raw = await callAI([system, user]);
  const parsed = parseJson(raw);

  const score = Math.min(question.marks, Math.max(0, Number(parsed.score) || 0));
  const pct = question.marks > 0 ? score / question.marks : 0;

  return {
    status: pct >= 0.8 ? 'correct' : pct >= 0.4 ? 'partial' : 'incorrect',
    correct: pct >= 0.6,
    score,
    maxScore: question.marks,
    gradingType: 'ai_rubric',
    feedback: String(parsed.feedback || ''),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    missingPoints: Array.isArray(parsed.missingPoints) ? parsed.missingPoints : [],
  };
}

/* ── Question Generation ──────────────────────────────────────── */
async function generateQuestions({ subject, topic, difficulty, questionType, count }) {
  const subjectInfo = (typeof SUBJECT_MAP !== 'undefined' && SUBJECT_MAP[subject]) || { name: subject, level: '', syllabus: '' };

  const typeInstructions = {
    mcq: `Multiple choice with exactly 4 options. "options":["A text","B text","C text","D text"], "correctAnswer":<0-3 integer>.`,
    'short-answer': `Short answer (3-6 marks). "options":null, "correctAnswer":null. Include detailed markScheme array.`,
    calculation: `Numerical problem. "options":null, "correctAnswer":"<exact numeric answer as string, e.g. 375000 or 0.050>".`,
    essay: `Extended response (6-12 marks). "options":null, "correctAnswer":null. Include markScheme with 6+ points.`,
  };

  const messages = [
    {
      role: 'system',
      content: `You are an expert ${subjectInfo.name} exam question writer for Cambridge International ${subjectInfo.level} level (syllabus ${subjectInfo.syllabus}). Write rigorous, exam-style questions matching Cambridge style exactly.`,
    },
    {
      role: 'user',
      content: `Write ${count} ${difficulty} ${questionType} exam question${count > 1 ? 's' : ''} on "${topic}" for ${subjectInfo.name}.

${typeInstructions[questionType] || ''}

Respond with ONLY a JSON array (no markdown), each object having EXACTLY these fields:
[
  {
    "prompt": "<full question text>",
    "questionType": "${questionType}",
    "topic": "${topic}",
    "difficulty": "${difficulty}",
    "marks": <integer>,
    "options": <see above>,
    "correctAnswer": <see above>,
    "explanation": "<full explanation of correct answer>",
    "markScheme": ["<mark point with [1] at end>", ...],
    "teachingSteps": ["<step 1>", "<step 2>", ...]
  }
]`,
    },
  ];

  const raw = await callAI(messages);
  const arr = parseJson(raw);
  if (!Array.isArray(arr)) throw new Error('Model returned unexpected format — try again.');

  return arr.map((q, i) => ({
    id: `ai_${subject}_${Date.now()}_${i}`,
    subject,
    level: subjectInfo.level,
    syllabus: subjectInfo.syllabus,
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
    // Ensure marks is a number
    marks: Number(q.marks) || 1,
    // Ensure correctAnswer is right type for mcq
    correctAnswer: q.questionType === 'mcq' ? Number(q.correctAnswer) : q.correctAnswer,
  }));
}

/* ── Past Paper Import ────────────────────────────────────────── */
async function importFromPastPaper({ subject, paperText, markSchemeText }) {
  const subjectInfo = (typeof SUBJECT_MAP !== 'undefined' && SUBJECT_MAP[subject]) || { name: subject, level: '', syllabus: '' };

  const messages = [
    {
      role: 'system',
      content: `You are an expert at extracting and structuring ${subjectInfo.name} Cambridge exam questions. Preserve original wording exactly. Match each question with its mark scheme answer.`,
    },
    {
      role: 'user',
      content: `Extract every question from this ${subjectInfo.name} past paper. Match with the mark scheme where provided.

PAST PAPER:
${paperText}

${markSchemeText ? `MARK SCHEME:\n${markSchemeText}` : '(No mark scheme provided — infer answers from questions)'}

Respond with ONLY a JSON array (no markdown), each object:
[
  {
    "prompt": "<exact question wording including sub-parts a,b,c etc>",
    "questionType": "mcq"|"short-answer"|"calculation"|"essay",
    "topic": "<inferred topic name>",
    "difficulty": "easy"|"medium"|"hard",
    "marks": <integer from paper>,
    "options": ["A","B","C","D"] or null,
    "correctAnswer": <0-3 for mcq, numeric string for calculation, null otherwise>,
    "explanation": "<explanation from mark scheme>",
    "markScheme": ["<mark point> [1]", ...],
    "teachingSteps": []
  }
]`,
    },
  ];

  const raw = await callAI(messages);
  const arr = parseJson(raw);
  if (!Array.isArray(arr)) throw new Error('Model returned unexpected format — try again.');

  return arr.map((q, i) => ({
    id: `pp_${subject}_${Date.now()}_${i}`,
    subject,
    level: subjectInfo.level,
    syllabus: subjectInfo.syllabus,
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
    marks: Number(q.marks) || 1,
    correctAnswer: q.questionType === 'mcq' ? Number(q.correctAnswer) : q.correctAnswer,
  }));
}

/* ── Auto-generate mark scheme for existing question ──────────── */
async function generateMarkScheme(question) {
  const subjectInfo = (typeof SUBJECT_MAP !== 'undefined' && SUBJECT_MAP[question.subject]) || {};
  const messages = [
    {
      role: 'system',
      content: `You are an expert Cambridge ${subjectInfo.name || question.subject} mark scheme writer.`,
    },
    {
      role: 'user',
      content: `Write a detailed mark scheme for this question:

${question.prompt}

Marks: ${question.marks}
Type: ${question.questionType}

Respond with ONLY a JSON object:
{"markScheme":["<mark point> [1]",...],"explanation":"<full model answer>","teachingSteps":["<step>",...]}`,
    },
  ];

  const raw = await callAI(messages);
  return parseJson(raw);
}
