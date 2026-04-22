#!/usr/bin/env node
/**
 * populate-topics.js
 *
 * Uses Groq (free tier) to classify questions into topics/subtopics
 * from a scraped Cambridge syllabus taxonomy.
 *
 * Usage:
 *   node scripts/populate-topics.js [options]
 *
 * Options:
 *   --subject <id>        Only process one subject_id (e.g. igcse_cscience)
 *   --syllabus <file>     Taxonomy file in scripts/syllabuses/ (e.g. 0653_combined_science.json)
 *   --limit <n>           Max questions to process
 *   --batch <n>           Questions per Groq API call (default 15)
 *   --concurrency <n>     Parallel API calls in flight (auto-tuned by provider count)
 *   --retry-passes <n>    Additional retry passes for failed questions (default 2; turbo 3)
 *   --continue            Resume from topic-progress-<subject>.json (skip already-done ids)
 *   --check               Re-classify already classified rows to verify/improve accuracy
 *   --turbo               Aggressive throughput defaults (higher batch + concurrency)
 *   --reset               Clear classifications and re-run from scratch
 *   --dry-run             Classify and print, do not write to DB
 *   --sync-local          Also sync topic/subtopic to local SQLite DATABASE_URL (slower)
 *
 * Required in scripts/.env.migrate:
 *   TURSO_URL, TURSO_TOKEN, HF_TOKEN
 * Optional:
 *   DATABASE_URL          e.g. file:./prisma/dev.db  (for local SQLite sync)
 */

'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');

// ── Load .env.migrate ──────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '.env.migrate');
if (!fs.existsSync(envPath)) { console.error('❌  Missing scripts/.env.migrate'); process.exit(1); }
const envRaw = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '').replace(/\r/g, '');
for (const line of envRaw.split('\n')) {
  const eq = line.indexOf('=');
  if (eq < 1) continue;
  const key = line.slice(0, eq).trim();
  const val = line.slice(eq + 1).trim();
  if (/^[A-Z0-9_]+$/.test(key)) process.env[key] = val;
}

const { TURSO_URL, TURSO_TOKEN, DATABASE_URL } = process.env;
if (!TURSO_URL)   { console.error('❌  Missing TURSO_URL');   process.exit(1); }
if (!TURSO_TOKEN) { console.error('❌  Missing TURSO_TOKEN'); process.exit(1); }

// ── Parse CLI args ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag, def = null) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
};
const hasArg = flag => args.includes(flag);
const DRY_RUN         = args.includes('--dry-run');
const SUBJECT_ID      = getArg('--subject');
const SYLLABUS_FILE   = getArg('--syllabus');
const LIMIT           = getArg('--limit') ? parseInt(getArg('--limit')) : Infinity;
const BATCH_CLI       = getArg('--batch');
const BATCH_SIZE      = BATCH_CLI ? parseInt(BATCH_CLI) : 15;
const CONCURRENCY_CLI = getArg('--concurrency');
const CONCURRENCY     = CONCURRENCY_CLI ? parseInt(CONCURRENCY_CLI) : null;
const RETRY_PASSES_CLI = getArg('--retry-passes');
const NO_CONSENSUS    = args.includes('--fast');
const CONTINUE_MODE   = hasArg('--continue');
const CHECK_MODE      = hasArg('--check');
const TURBO_MODE      = hasArg('--turbo');
const RETRY_PASSES    = RETRY_PASSES_CLI ? parseInt(RETRY_PASSES_CLI) : 3;
const SYNC_LOCAL      = hasArg('--sync-local');

// ── Load taxonomy ──────────────────────────────────────────────────────────────
function loadTaxonomy(subjectId) {
  // If --syllabus flag given, use that file
  if (SYLLABUS_FILE) {
    const p = path.join(__dirname, 'syllabuses', SYLLABUS_FILE);
    if (!fs.existsSync(p)) { console.error(`❌  Syllabus file not found: ${p}`); process.exit(1); }
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  // Otherwise, try to find a matching syllabus by subject_id
  const dir = path.join(__dirname, 'syllabuses');
  if (!fs.existsSync(dir)) return null;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (data.subject_id === subjectId) return data;
  }
  return null;
}

// Strip leading number prefixes from topic keys (e.g. "14. Coordination" → "Coordination")
function cleanTopicKey(t) {
  return t.replace(/^\d+(\.\d+)*\.?\s+/, '').trim();
}

// Build a flat list of { section, topic (clean), subtopics[] } from a taxonomy's sections
function flattenTaxonomy(taxonomy) {
  const flat = [];
  for (const [section, topics] of Object.entries(taxonomy.sections)) {
    for (const [topic, subtopics] of Object.entries(topics)) {
      flat.push({ section, topic: cleanTopicKey(topic), subtopics });
    }
  }
  return flat;
}

// Format taxonomy as a compact string for the AI prompt
// Uses pipe-separated format: Section > Topic: Sub1|Sub2|Sub3  (saves ~40% tokens vs JSON)
function formatTaxonomyForPrompt(taxonomy) {
  const lines = [];
  for (const [section, topics] of Object.entries(taxonomy.sections)) {
    for (const [topic, subtopics] of Object.entries(topics)) {
      lines.push(`${section} > ${cleanTopicKey(topic)}: ${subtopics.join('|')}`);
    }
  }
  return lines.join('\n');
}

// Validate that topic/subtopic are in the taxonomy; returns corrected values or null
function validateAndFix(taxonomy, section, topic, subtopic) {
  const flat = flattenTaxonomy(taxonomy);

  // Guard against null/undefined from AI
  topic    = topic    || '';
  subtopic = subtopic || '';
  section  = section  || '';

  // Try exact match first
  const match = flat.find(e => e.section === section && e.topic === topic);
  if (match) {
    const validSub = match.subtopics.includes(subtopic) ? subtopic : match.subtopics[0];
    return { section, topic, subtopic: validSub };
  }

  // Try fuzzy topic match (case-insensitive substring)
  const fuzzy = topic ? flat.find(e =>
    e.topic.toLowerCase().includes(topic.toLowerCase()) ||
    topic.toLowerCase().includes(e.topic.toLowerCase())
  ) : null;
  if (fuzzy) {
    const validSub = fuzzy.subtopics.includes(subtopic) ? subtopic : fuzzy.subtopics[0];
    return { section: fuzzy.section, topic: fuzzy.topic, subtopic: validSub, fuzzy: true };
  }

  // Fallback: first topic in correct section
  const sectionTopics = flat.filter(e => e.section === section);
  if (sectionTopics.length) {
    return { section, topic: sectionTopics[0].topic, subtopic: sectionTopics[0].subtopics[0], fallback: true };
  }

  // Ultimate fallback: nothing matched — return null so the question is retried rather than stored wrong
  return null;
}

// ── Turso helpers ──────────────────────────────────────────────────────────────
const TURSO_HTTP  = TURSO_URL.replace(/^libsql:\/\//, 'https://');
const FETCH_TIMEOUT = 30000;

async function fetchWithTimeout(url, opts = {}, timeoutMs = FETCH_TIMEOUT) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Turso timed out after ${timeoutMs / 1000}s`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function tursoExec(statements) {
  if (!statements.length) return;
  const requests = statements.map(s => ({
    type: 'execute',
    stmt: {
      sql: s.sql,
      args: (s.args || []).map(v =>
        v === null            ? { type: 'null' } :
        typeof v === 'number' ? { type: 'integer', value: String(v) } :
                                { type: 'text',    value: String(v) }
      ),
    },
  }));
  requests.push({ type: 'close' });
  const res = await fetchWithTimeout(`${TURSO_HTTP}/v2/pipeline`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ requests }),
  });
  if (!res.ok) throw new Error(`Turso ${res.status}: ${await res.text()}`);
  return res.json();
}

async function tursoQuery(sql, args = []) {
  const res = await tursoExec([{ sql, args }]);
  const result = res?.results?.[0]?.response?.result;
  if (!result) return [];
  const { cols, rows } = result;
  return rows.map(row =>
    Object.fromEntries(cols.map((c, i) => [c.name, row[i]?.value ?? null]))
  );
}

// ── Local SQLite sync (optional, best-effort) ──────────────────────────────────
let localDb = null;
function getLocalDb() {
  if (localDb) return localDb;
  if (!DATABASE_URL) return null;
  const dbPath = DATABASE_URL.replace(/^file:/, '').replace(/^\.\//, '');
  const absPath = path.resolve(path.join(__dirname, '..'), dbPath);
  if (!fs.existsSync(absPath)) return null;
  try {
    const Database = require('better-sqlite3');
    localDb = new Database(absPath);
    return localDb;
  } catch {
    return null;
  }
}

function updateLocalDb(id, section, topic, subtopic) {
  if (!SYNC_LOCAL) return;
  const db = getLocalDb();
  if (!db) return;
  try {
    db.prepare('UPDATE ExtractedQuestion SET topic = ?, subtopic = ? WHERE id = ?')
      .run(topic, subtopic, id);
  } catch { /* best-effort */ }
}

// ── Progress ───────────────────────────────────────────────────────────────────
const PROGRESS_FILE = path.join(__dirname, `topic-progress-${SUBJECT_ID || 'default'}.json`);

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      p.fallbacks = p.fallbacks || [];
      p.confidenceMap = p.confidenceMap || {};
      return p;
    } catch {}
  }
  return { done: [], failed: [], fallbacks: [], confidenceMap: {} };
}

function saveProgress(p) {
  const tmp = PROGRESS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(p, null, 2));
  fs.renameSync(tmp, PROGRESS_FILE);
}

let lastProgressSaveAt = 0;
function saveProgressThrottled(progress, force = false) {
  const now = Date.now();
  if (!force && now - lastProgressSaveAt < 2000) return;
  saveProgress(progress);
  lastProgressSaveAt = now;
}

// ── API Providers (in priority order) ─────────────────────────────────────────
// Collect all keys for a base env var (KEY, KEY_2, KEY_3, ...) — enables key rotation
function getEnvKeys(base) {
  const keys = [];
  if (process.env[base]) keys.push(process.env[base]);
  for (let i = 2; i <= 20; i++) {
    const v = process.env[`${base}_${i}`];
    if (v) keys.push(v); else break;
  }
  return keys;
}

// Expand one provider definition into N entries (one per key), named "Groq", "Groq-2", etc.
function expandProvider(baseName, envVar, url, model, headersBuilder) {
  return getEnvKeys(envVar).map((key, idx) => ({
    name: idx === 0 ? baseName : `${baseName}-${idx + 1}`,
    enabled: true,
    url,
    model,
    headers: () => headersBuilder(key),
  }));
}

// ── Ollama (local) — auto-detected, used first if available ───────────────────
// Install: https://ollama.com  then:  ollama pull llama3.2
// If Ollama isn't running it fails silently and falls back to cloud providers.
const OLLAMA_URL     = process.env.OLLAMA_URL   || 'http://localhost:11434';
const OLLAMA_MODEL   = process.env.OLLAMA_MODEL || 'llama3.2'; // change to e.g. mistral or qwen2.5:3b
const OLLAMA_TIMEOUT = 300_000; // 5 min — local models are slow; adjust if needed
const CLOUD_TIMEOUT  =  90_000; // 90 s for cloud providers

function makeOllamaProvider(name, model) {
  return {
    name,
    enabled: true,
    url: `${OLLAMA_URL}/v1/chat/completions`,
    model,
    headers: () => ({ 'Content-Type': 'application/json' }),
    isOllama: true,
  };
}

const PROVIDERS = [
  // Ollama (local) — unlimited, no API key needed
  makeOllamaProvider('Ollama', OLLAMA_MODEL),

  // ── High-quality cloud providers ──
  ...expandProvider('Gemini', 'GEMINI_API_KEY',
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    'gemini-2.0-flash',
    key => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
  ),
  ...expandProvider('Groq', 'GROQ_API_KEY',
    'https://api.groq.com/openai/v1/chat/completions',
    'llama-3.3-70b-versatile',
    key => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
  ),
  ...expandProvider('Nvidia', 'NVIDIA_API_KEY',
    'https://integrate.api.nvidia.com/v1/chat/completions',
    'meta/llama-3.3-70b-instruct',
    key => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
  ),
  ...expandProvider('SambaNova', 'SAMBANOVA_API_KEY',
    'https://api.sambanova.ai/v1/chat/completions',
    'Meta-Llama-3.3-70B-Instruct',
    key => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
  ),
  // Anthropic — uses native messages API (handled specially in classifyBatch)
  ...getEnvKeys('ANTHROPIC_API_KEY').map((key, idx) => ({
    name: idx === 0 ? 'Anthropic' : `Anthropic-${idx + 1}`,
    enabled: true,
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-haiku-4-5-20251001',
    headers: () => ({
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    }),
    isAnthropic: true,
  })),
  ...expandProvider('DeepSeek', 'DEEPSEEK_API_KEY',
    'https://api.deepseek.com/v1/chat/completions',
    'deepseek-chat',
    key => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
  ),
  ...expandProvider('Mistral', 'MISTRAL_API_KEY',
    'https://api.mistral.ai/v1/chat/completions',
    'mistral-small-latest',
    key => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
  ),
  ...expandProvider('Cohere', 'COHERE_API_KEY',
    'https://api.cohere.com/compatibility/v1/chat/completions',
    'command-r7b-12-2024',
    key => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
  ),
  ...expandProvider('OpenRouter', 'OPENROUTER_API_KEY',
    'https://openrouter.ai/api/v1/chat/completions',
    'meta-llama/llama-3.1-8b-instruct:free',
    key => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://study-platform.app' }),
  ),
  ...expandProvider('Together', 'TOGETHER_API_KEY',
    'https://api.together.xyz/v1/chat/completions',
    'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
    key => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
  ),
  ...expandProvider('HuggingFace', 'HF_TOKEN',
    'https://router.huggingface.co/v1/chat/completions',
    'Qwen/Qwen2.5-72B-Instruct',
    key => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
  ),
].filter(p => p.enabled);

// ── Provider round-robin distribution ────────────────────────────────────────
// Instead of a random shuffle each time (which lets all 50 concurrent workers
// pile onto the same provider simultaneously), we use a rotating cursor so
// consecutive batch calls are pre-assigned DIFFERENT starting providers.
// This keeps all providers busy and no API key sits idle while another is overloaded.

const exhaustedProviders = new Set();

// Global cooldown map: providerName → cooldownUntilMs
// When a provider returns 429, it's placed in cooldown for 30-60s.
// getShuffledProviders() skips cooled-down providers so workers never await a sleep().
const providerCooldowns = {};

function isCooling(name) {
  return (providerCooldowns[name] || 0) > Date.now();
}

function setCooldown(name, waitMs) {
  providerCooldowns[name] = Date.now() + waitMs;
}

// Global round-robin cursors — each new batch atomically claims the next slot
let _rrCursor = 0;      // for normal passes
let _rrCursorEx = 0;    // for consensus pass 2 (exclude-list aware)

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build provider order for this batch.
// Uses round-robin cursor to ensure consecutive batches start on different providers.
// excludeNames: providers to push to the back (consensus pass 2/3 avoidance).
function getShuffledProviders(excludeNames = new Set()) {
  const available = PROVIDERS.filter(p => !exhaustedProviders.has(p.name) && !isCooling(p.name));
  if (available.length === 0) {
    exhaustedProviders.clear();
    _rrCursor = 0;
    if (typeof log === 'function') log('All providers exhausted — resetting');
    return PROVIDERS.slice(); // all providers, original order
  }

  const preferred = available.filter(p => !excludeNames.has(p.name));
  const fallback  = available.filter(p =>  excludeNames.has(p.name));

  if (preferred.length === 0) return shuffle(fallback);

  // Atomically claim a start offset (round-robin across preferred providers)
  const cursor    = _rrCursor % preferred.length;
  _rrCursor       = cursor + 1; // no modulo here — avoids thundering-herd reset

  // Rotate preferred list so each batch starts on a different provider
  const rotated = [...preferred.slice(cursor), ...preferred.slice(0, cursor)];

  // Fallback providers (from prior passes) go to the end, shuffled randomly
  return [...rotated, ...shuffle(fallback)];
}

// ── Live Dashboard ────────────────────────────────────────────────────────────
// Tracks provider health and renders a clean status block instead of spamming
// console.warn. All error output goes to the log file.

const dash = {
  subject:    '',
  total:      0,
  done:       0,
  failed:     0,
  fallbacks:  0,
  startMs:    Date.now(),
  providers:  {}, // name → { state:'idle'|'alive'|'exhausted'|'retry'|'timeout', calls:0, errors:0, retryAt:0 }
  _lines:     0,
  _interval:  null,
};

// Saved console methods — restored when dashboard stops
const _origLog   = console.log.bind(console);
const _origWarn  = console.warn.bind(console);
const _origError = console.error.bind(console);
const DASH_INTERVAL_MS = 1200;
const DASH_PLAIN_INTERVAL_MS = 1200;

function dashInit() {
  for (const p of PROVIDERS) {
    dash.providers[p.name] = { state: 'idle', calls: 0, errors: 0, retryAt: 0 };
  }
}

function dashSet(name, state, retryAt = 0) {
  const s = dash.providers[name];
  if (!s) return;
  s.state   = state;
  s.retryAt = retryAt;
  if (state === 'alive')   s.calls++;
  if (state !== 'idle' && state !== 'alive') s.errors++;
}

function dashRender() {
  const now    = Date.now();
  const elap   = Math.round((now - dash.startMs) / 1000);
  const pct    = dash.total > 0 ? Math.round(dash.done / dash.total * 100) : 0;
  const filled = Math.round(40 * pct / 100);
  const bar    = '\u2588'.repeat(filled) + '\u2591'.repeat(40 - filled);

  const lines = [];
  lines.push(`Subject: ${dash.subject}`);
  lines.push(`[${bar}] ${dash.done}/${dash.total} (${pct}%) | \u2717 ${dash.failed} fails | ~${dash.fallbacks} fuzzy | ${elap}s`);
  lines.push('');
  lines.push('API Providers:');

  const cols = 2;
  const entries = Object.entries(dash.providers);
  // two-column layout
  for (let i = 0; i < entries.length; i += cols) {
    let row = '';
    for (let c = 0; c < cols && i + c < entries.length; c++) {
      const [name, s] = entries[i + c];
      const icon = s.state === 'alive'     ? '\x1b[32m\u25cf\x1b[0m' :
                   s.state === 'exhausted' ? '\x1b[31m\u2715\x1b[0m' :
                   s.state === 'retry'     ? '\x1b[33m\u25cb\x1b[0m' :
                   s.state === 'timeout'   ? '\x1b[35m\u29D7\x1b[0m' :
                                            '\x1b[90m\u00b7\x1b[0m';
      // Build status string — don't duplicate "retry" when already in retry state
      const statusStr = s.state === 'retry'
        ? `retry ${Math.max(0, Math.ceil((s.retryAt - now) / 1000))}s`
        : s.state + (s.calls > 0 ? ` ${s.calls}\u2713` : '');
      const cell = `${icon} ${name.slice(0, 14).padEnd(14)} ${statusStr.slice(0, 14).padEnd(14)}`;
      row += '  ' + cell;
    }
    lines.push(row);
  }

  // Fallback mode: non-TTY output (piped / redirected). TERM is Unix-only so
  // don't gate on it — Windows TTYs (cmd, PowerShell, Windows Terminal) all
  // support ANSI escapes even without TERM being set.
  if (!process.stdout.isTTY) {
    const nowMs = Date.now();
    if (!dash._lastPlainRenderMs || (nowMs - dash._lastPlainRenderMs) >= DASH_PLAIN_INTERVAL_MS || dash.done >= dash.total) {
      dash._lastPlainRenderMs = nowMs;
      const plain = `Progress ${dash.done}/${dash.total} (${pct}%) | fails ${dash.failed} | fuzzy ${dash.fallbacks} | ${elap}s`;
      const pad = Math.max(0, (dash._lastPlainLen || 0) - plain.length);
      process.stdout.write(`\r${plain}${' '.repeat(pad)}`);
      dash._lastPlainLen = plain.length;
    }
    return;
  }

  // Overwrite previous render line-by-line with [2K for reliable Windows/PowerShell support
  let out = '';
  if (dash._lines > 0) {
    out += `\x1b[${dash._lines}A`; // move cursor up
  }
  for (const line of lines) {
    out += `\x1b[2K${line}\r\n`;  // erase entire line, write content, CRLF
  }
  // Erase any leftover lines from a previously taller render
  const extra = dash._lines - lines.length;
  for (let i = 0; i < extra; i++) out += `\x1b[2K\r\n`;
  if (extra > 0) out += `\x1b[${extra}A`; // move back up past the blanked lines
  process.stdout.write(out);
  dash._lines = lines.length;
}

function dashStart(subjectLabel, total) {
  dash.subject  = subjectLabel;
  dash.total    = total;
  dash.done     = 0;
  dash.failed   = 0;
  dash.fallbacks = 0;
  dash.startMs  = Date.now();
  dash._lines   = 0;
  dash._lastPlainRenderMs = 0;
  dash._lastPlainLen = 0;
  // Redirect console output to the log file — any stray console.log would corrupt
  // the ANSI line count and cause the dashboard to visually desync.
  console.log  = (...a) => { if (typeof log === 'function') log('[stdout] ' + a.join(' ')); };
  console.warn = (...a) => { if (typeof log === 'function') log('[warn] '   + a.join(' ')); };
  dashRender();
  dash._interval = setInterval(dashRender, DASH_INTERVAL_MS);
}

function dashStop() {
  if (dash._interval) { clearInterval(dash._interval); dash._interval = null; }
  dashRender(); // final render
  process.stdout.write('\n');
  dash._lines = 0;
  // Restore original console methods
  console.log   = _origLog;
  console.warn  = _origWarn;
  console.error = _origError;
}

// ── AI Classification ──────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));
let log = () => {}; // replaced in main() with a file-backed logger
const providerQuestionCounts = {};

function appendRunHistory(entry) {
  const file = path.join(__dirname, 'topic-classifier-runs.jsonl');
  try {
    fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n');
  } catch {
    // best-effort
  }
}

// classifyBatch — returns { results, providerUsed }
// excludeProviders: Set of provider names to deprioritise (for consensus pass 2/3)
async function classifyBatch(questions, taxonomy, excludeProviders = new Set()) {
  const taxonomyStr = formatTaxonomyForPrompt(taxonomy);
  const questionList = questions.map(q => ({
    id:         q.id,
    text:       (q.ms_text || '').slice(0, 400),
    markScheme: (q.ms_guidance || '').slice(0, 200),
  }));

  const sections = Object.keys(taxonomy.sections).join('|');
  const systemMsg = `You are classifying Cambridge ${taxonomy.syllabus} exam questions.
Use ONLY exact taxonomy strings provided. Return valid JSON with a "results" array.
For assessment_objectives, use the Cambridge AO codes for this subject (e.g. AO1, AO2, AO3).
Mark deprecated=true ONLY if content is clearly absent from the CURRENT syllabus (very obvious, e.g. a topic explicitly removed in a recent syllabus change).`;

  const userMsg = `TAXONOMY (Section > Topic: Subtopics):
${taxonomyStr}

QUESTIONS:
${questionList.map(q => `${q.id}: ${q.text}${q.markScheme ? ' | MS: ' + q.markScheme : ''}`).join('\n')}

You MUST return exactly ${questions.length} results, one per question — do not skip any.
Return JSON exactly like this (1-3 assessment_objectives per question):
{"results":[{"id":"...","section":"${sections}","topic":"exact topic","subtopic":"exact subtopic","assessment_objectives":["AO1","AO2"],"deprecated":false}]}`;

  const providerOrder = getShuffledProviders(excludeProviders);
  const perProviderRetries = {};
  const MAX_RETRIES_PER_PROVIDER = 2;

  for (const provider of providerOrder) {
    if (exhaustedProviders.has(provider.name)) continue;

    try {
      const reqTimeout = provider.isOllama ? OLLAMA_TIMEOUT : CLOUD_TIMEOUT;
      const fetchCtrl  = new AbortController();
      const fetchTimer = setTimeout(() => fetchCtrl.abort(), reqTimeout);
      let res;

      // Build request body — Anthropic uses a different schema
      // Scale max_tokens with batch size: ~150 tokens per result + 512 framing headroom, cap at 8192
      const maxTokens = Math.min(8192, questions.length * 150 + 512);
      const body = provider.isAnthropic
        ? JSON.stringify({ model: provider.model, max_tokens: maxTokens,
            system: systemMsg,
            messages: [{ role: 'user', content: userMsg }] })
        : JSON.stringify({ model: provider.model, temperature: 0.1, max_tokens: maxTokens,
            messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: userMsg }] });

      try {
        res = await fetch(provider.url, {
          method: 'POST', headers: provider.headers(), signal: fetchCtrl.signal, body,
        });
      } catch (fetchErr) {
        clearTimeout(fetchTimer);
        const isTimeout = fetchErr.name === 'AbortError';
        dashSet(provider.name, isTimeout ? 'timeout' : 'idle');
        if (typeof log === 'function') log(`${provider.name} ${isTimeout ? 'timeout' : 'fetch error'}: ${fetchErr.message}`);
        continue;
      } finally {
        clearTimeout(fetchTimer);
      }

      // Quota / auth errors — mark exhausted globally
      if (res.status === 401 || res.status === 402 || res.status === 403) {
        exhaustedProviders.add(provider.name);
        dashSet(provider.name, 'exhausted');
        if (typeof log === 'function') log(`${provider.name} exhausted (${res.status})`);
        continue;
      }

      // Rate limited — set global cooldown and move to next provider immediately.
      // We never await here: the cooldown is checked by getShuffledProviders() so
      // all other workers also skip this provider without blocking.
      if (res.status === 429) {
        perProviderRetries[provider.name] = (perProviderRetries[provider.name] || 0) + 1;
        const attempt = perProviderRetries[provider.name];
        const wait    = Math.min(15000 * attempt, 60000); // 15s / 30s / 45s / 60s
        const retryAt = Date.now() + wait;
        setCooldown(provider.name, wait);
        dashSet(provider.name, 'retry', retryAt);
        if (typeof log === 'function') log(`${provider.name} 429 (attempt ${attempt}) — cooling ${wait / 1000}s`);
        if (attempt >= MAX_RETRIES_PER_PROVIDER) {
          exhaustedProviders.add(provider.name);
          dashSet(provider.name, 'exhausted');
        }
        // No await sleep() — skip immediately to the next provider
        continue;
      }

      if (!res.ok) {
        const txt = await res.text();
        dashSet(provider.name, 'idle');
        if (typeof log === 'function') log(`${provider.name} ${res.status}: ${txt.slice(0, 200)}`);
        continue;
      }

      const json = await res.json();

      // Parse response — Anthropic uses content[0].text, others use choices[0].message.content
      const rawText = provider.isAnthropic
        ? (json.content?.[0]?.text ?? '{}')
        : (json.choices?.[0]?.message?.content ?? '{}');

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        dashSet(provider.name, 'idle');
        if (typeof log === 'function') log(`${provider.name} returned no JSON`);
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (_parseErr) {
        // Response was truncated mid-JSON. Extract every fully-closed result object.
        const partialMatches = rawText.matchAll(/\{"id"\s*:\s*"[^"]+?"[\s\S]*?\}/g);
        const rescued = [];
        for (const m of partialMatches) {
          try { rescued.push(JSON.parse(m[0])); } catch { /* incomplete, skip */ }
        }
        if (rescued.length > 0) {
          if (typeof log === 'function') log(`${provider.name} truncated — rescued ${rescued.length}/${questions.length} results`);
          providerQuestionCounts[provider.name] = (providerQuestionCounts[provider.name] || 0) + rescued.length;
          dashSet(provider.name, 'alive');
          return { results: rescued, providerUsed: provider.name };
        }
        dashSet(provider.name, 'idle');
        if (typeof log === 'function') log(`${provider.name} error: ${_parseErr.message}`);
        continue;
      }
      const classifiedCount = Array.isArray(parsed.results) ? parsed.results.length : 0;
      providerQuestionCounts[provider.name] = (providerQuestionCounts[provider.name] || 0) + classifiedCount;
      dashSet(provider.name, 'alive');
      if (typeof log === 'function') log(`Batch classified via ${provider.name}`);
      return { results: parsed.results ?? [], providerUsed: provider.name };

    } catch (e) {
      dashSet(provider.name, 'idle');
      if (typeof log === 'function') log(`${provider.name} error: ${e.message}`);
    }
  }

  // All providers failed for this batch
  if (typeof log === 'function') log('All providers failed for batch');
  return { results: [], providerUsed: null };
}

// ── Ollama health check ───────────────────────────────────────────────────────
async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return false;
    const json = await res.json();
    const models = json.models?.map(m => m.name) || [];
    const hasModel = models.some(m => m.startsWith(OLLAMA_MODEL.split(':')[0]));
    if (hasModel) {
      console.log(`✓  Ollama detected at ${OLLAMA_URL} — model: ${OLLAMA_MODEL}`);
      return true;
    }
    console.log(`⚠  Ollama running but model "${OLLAMA_MODEL}" not found. Pull it with: ollama pull ${OLLAMA_MODEL}`);
    return false;
  } catch {
    return false; // Ollama not running — fall through to cloud providers
  }
}

// ── Voting helpers ────────────────────────────────────────────────────────────
// Returns { winner: string|null, count: number, plurality: string|null }
// winner is set only when count >= threshold; plurality is always the top vote.
function pickByVote(votes, threshold) {
  const counts = {};
  for (const v of votes) { if (v != null) counts[v] = (counts[v] || 0) + 1; }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return { winner: null, count: 0, plurality: null };
  const [top, topCount] = sorted[0];
  return { winner: topCount >= threshold ? top : null, count: topCount, plurality: top };
}

// ── Consensus Classification (up to 5-model majority vote) ────────────────────
// Runs up to 5 passes with distinct providers, picks topic/subtopic by 3/5 vote.
// Falls back to plurality when consensus not reached (confidence 1-2).
// Returns results with `confidence` field (1-5 = number of models that agreed).
// Deprecated requires strict majority (>50%) to be marked true.
async function classifyWithConsensus(questions, taxonomy) {
  // Fast mode (--fast): single pass, no consensus
  if (NO_CONSENSUS) {
    const { results } = await classifyBatch(questions, taxonomy);
    return results.map(r => ({ ...r, deprecated: false, assessment_objectives: r.assessment_objectives || [], confidence: 1 }));
  }

  // Run up to 5 passes with different providers
  const allPassResults = [];
  const usedProviders = new Set();
  const TARGET_PASSES = 5;

  for (let i = 0; i < TARGET_PASSES; i++) {
    const hasUnused = PROVIDERS.some(p => !exhaustedProviders.has(p.name) && !usedProviders.has(p.name));
    if (!hasUnused) break;
    const { results, providerUsed } = await classifyBatch(questions, taxonomy, usedProviders);
    if (!providerUsed || results.length === 0) break;
    allPassResults.push({ results, provider: providerUsed });
    usedProviders.add(providerUsed);
    // Early exit once 3+ passes all agree on every question
    if (allPassResults.length >= 3) {
      const passMapsEarly = allPassResults.map(p => Object.fromEntries(p.results.map(r => [r.id, r])));
      const allAgree = questions.every(q => {
        const rr = passMapsEarly.map(m => m[q.id]).filter(Boolean);
        return rr.length >= 3 && rr.slice(1).every(r => r.topic === rr[0].topic && r.subtopic === rr[0].subtopic);
      });
      if (allAgree) break;
    }
  }

  if (allPassResults.length === 0) return [];
  if (allPassResults.length === 1) {
    return allPassResults[0].results.map(r => ({ ...r, deprecated: false, confidence: 1 }));
  }

  if (typeof log === 'function') {
    log(`Consensus: ran ${allPassResults.length} passes via [${allPassResults.map(p => p.provider).join(', ')}]`);
  }

  const passMaps = allPassResults.map(p => Object.fromEntries(p.results.map(r => [r.id, r])));

  return questions.map(q => {
    const allR = passMaps.map(m => m[q.id]).filter(Boolean);
    if (allR.length === 0) return null;

    // Vote on topic+subtopic; require 4/5 agreement for "consensus"
    const topicVotes = allR.map(r => `${r.topic}||${r.subtopic}`);
    const { winner: topicWinner, count: topicCount, plurality: topicPlurality } = pickByVote(topicVotes, 4);

    const winnerKey = topicWinner ?? topicPlurality;
    const [topic, subtopic] = winnerKey ? winnerKey.split('||') : [allR[0].topic, allR[0].subtopic];
    const confidence = topicWinner
      ? topicCount
      : topicVotes.filter(v => v === winnerKey).length;

    const agreers = allR.filter(r => `${r.topic}||${r.subtopic}` === winnerKey);
    const base = agreers[0] || allR[0];

    // Vote on deprecated: strict majority required
    const depVotes = allR.map(r => String(!!r.deprecated));
    const majorityThreshold = Math.floor(allR.length / 2) + 1;
    const { winner: depWinner } = pickByVote(depVotes, majorityThreshold);
    const deprecated = depWinner === 'true';

    // Union assessment_objectives from agreers
    const aoUnion = [...new Set(agreers.flatMap(r => r.assessment_objectives || []))];

    return {
      ...base,
      topic,
      subtopic,
      section: base.section || allR[0].section,
      assessment_objectives: aoUnion,
      deprecated,
      confidence,
    };
  }).filter(Boolean);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const logFile = path.join(__dirname, 'topic-classifier.log');
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  for (const k of Object.keys(providerQuestionCounts)) delete providerQuestionCounts[k];
  log = (msg) => {
    logStream.write(`[${new Date().toISOString()}] ${msg}\n`);
  };

  console.log('🏷   Topic Classifier (multi-provider failover)');
  console.log(`    Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}  Batch: ${BATCH_CLI || (TURBO_MODE ? 'auto(turbo)' : BATCH_SIZE)}  Concurrency: ${CONCURRENCY_CLI || (TURBO_MODE ? 'auto(turbo)' : 'auto')}  Retries: ${RETRY_PASSES}  Consensus: ${NO_CONSENSUS ? 'OFF (--fast)' : 'ON'}  Resume: ${CONTINUE_MODE ? 'ON (--continue)' : 'OFF'}  Check: ${CHECK_MODE ? 'ON' : 'OFF'}  Turbo: ${TURBO_MODE ? 'ON' : 'OFF'}`);
  console.log('\u2500'.repeat(60));

  // ── Ollama health-check ──────────────────────────────────────────────────────
  const ollamaOk = await checkOllama();
  if (!ollamaOk) {
    const ollamaIdx = PROVIDERS.findIndex(p => p.isOllama);
    if (ollamaIdx !== -1) PROVIDERS.splice(ollamaIdx, 1);
  }
  dashInit(); // initialise provider status tracking (after PROVIDERS is finalised)
  const cpuCount = Array.isArray(os.cpus()) ? os.cpus().length : 4;
  const autoConcurrency = TURBO_MODE
    ? Math.max(32, Math.min(320, Math.max(PROVIDERS.length * 8, cpuCount * 10)))
    : Math.max(16, Math.min(160, Math.max(PROVIDERS.length * 4, cpuCount * 6)));
  const effectiveBatchSize = BATCH_CLI
    ? BATCH_SIZE
    : (TURBO_MODE ? 45 : BATCH_SIZE);
  const effectiveConcurrency = CONCURRENCY && Number.isFinite(CONCURRENCY) && CONCURRENCY > 0
    ? CONCURRENCY
    : autoConcurrency;
  appendRunHistory({
    event: 'start',
    runId,
    subject: SUBJECT_ID || null,
    syllabus: SYLLABUS_FILE || null,
    flags: {
      dryRun: DRY_RUN,
      fast: NO_CONSENSUS,
      continue: CONTINUE_MODE,
      check: CHECK_MODE,
      turbo: TURBO_MODE,
      syncLocal: SYNC_LOCAL,
      reset: args.includes('--reset') && !CHECK_MODE,
    },
    settings: {
      batch: effectiveBatchSize,
      concurrency: effectiveConcurrency,
      retryPasses: RETRY_PASSES,
      limit: LIMIT === Infinity ? 999999 : LIMIT,
    },
    providers: PROVIDERS.map(p => ({ name: p.name, model: p.model })),
  });

  // ── Load taxonomy ────────────────────────────────────────────────────────────
  const taxonomy = loadTaxonomy(SUBJECT_ID);
  if (!taxonomy) {
    console.error('❌  No taxonomy found. Use --syllabus <filename> or ensure scripts/syllabuses/ contains a matching file.');
    process.exit(1);
  }
  console.log(`✓  Taxonomy loaded: ${taxonomy.name} (${taxonomy.syllabus})`);

  // ── Ensure Turso has the extra columns (best-effort — ignore if already exist) ─
  for (const col of [
    'ALTER TABLE questions ADD COLUMN section TEXT',
    'ALTER TABLE questions ADD COLUMN topic TEXT',
    'ALTER TABLE questions ADD COLUMN subtopic TEXT',
    'ALTER TABLE questions ADD COLUMN assessment_objectives TEXT',
    'ALTER TABLE questions ADD COLUMN deprecated INTEGER DEFAULT 0',
  ]) {
    try { await tursoExec([{ sql: col }]); } catch { /* column already exists — fine */ }
  }

  // ── Load progress ──────────────────────────────────────────────────────────────
  const RESET = args.includes('--reset') && !CHECK_MODE;
  const progress = loadProgress();
  const useContinue = CONTINUE_MODE && !RESET && !CHECK_MODE;
  let done = 0, failed = 0, fallbacks = 0, improved = 0, unchanged = 0;
  const startTime = Date.now();
  const failedIdsThisRun = new Set();
  const progressDoneSet = new Set(progress.done || []);
  const progressFailedSet = new Set(progress.failed || []);
  const syncProgressArrays = () => {
    if (CHECK_MODE) return;
    progress.done = Array.from(progressDoneSet);
    progress.failed = Array.from(progressFailedSet);
  };
  let interrupted = false;
  let periodicSaveTimer = null;

  const closeAndExit = (code) => {
    try { process.off('SIGINT', onSigInt); } catch {}
    try { if (periodicSaveTimer) clearInterval(periodicSaveTimer); } catch {}
    try {
      logStream.end(() => process.exit(code));
    } catch {
      process.exit(code);
    }
  };

  const onSigInt = () => {
    if (interrupted) return;
    interrupted = true;
    try { dashStop(); } catch {}
    try { syncProgressArrays(); if (!CHECK_MODE) saveProgressThrottled(progress, true); } catch {}
    try { log(`Interrupted by user (SIGINT). Progress saved. done=${done} failed=${failed}`); } catch {}
    appendRunHistory({
      event: 'interrupted',
      runId,
      subject: SUBJECT_ID || null,
      syllabus: SYLLABUS_FILE || null,
      done,
      failed,
      fallbacks,
      improved,
      unchanged,
      providerQuestionCounts,
    });
    _origLog('\nInterrupted safely. Progress/log flushed. You can restart.');
    closeAndExit(130);
  };
  process.on('SIGINT', onSigInt);

  if (RESET) {
    // Clear in-memory progress so we don't skip anything this run
    progress.done = []; progress.failed = []; progress.fallbacks = []; progress.confidenceMap = {};
    // Wipe the new columns in Turso so the WHERE section IS NULL query picks them up
    const clearWhere = SUBJECT_ID ? `WHERE subject_id = '${SUBJECT_ID}'` : '';
    console.log(`  ↺  Clearing classification columns in Turso${SUBJECT_ID ? ' for ' + SUBJECT_ID : ' (ALL subjects)'}...`);
    try {
      await tursoExec([{
        sql: `UPDATE questions SET section = NULL, topic = NULL, subtopic = NULL,
              assessment_objectives = NULL, deprecated = 0 ${clearWhere}`,
        args: [],
      }]);
      console.log('  ↺  Done — all questions will be reclassified.');
    } catch (e) {
      console.log('  ⚠  Could not clear Turso columns (will still proceed):', e.message);
    }
  }

  // ── Fetch questions that need classification ──────────────────────────────────
  // Only fetch rows where the new 'section' column is NULL — covers:
  //   • Fresh installs (never classified)
  //   • Old-schema rows (had topics but not section)
  //   • Post-reset rows (just wiped above)
  const subjectWhere = SUBJECT_ID ? `AND subject_id = '${SUBJECT_ID}'` : '';
  const limitVal = LIMIT === Infinity ? 999999 : LIMIT;
  const rawRows = CHECK_MODE
    ? await tursoQuery(
      `SELECT id, ms_text, ms_guidance,
              section AS existing_section, topic AS existing_topic, subtopic AS existing_subtopic
       FROM questions
       WHERE (section IS NOT NULL AND section <> '') ${subjectWhere}
       LIMIT ?`,
      [limitVal]
    )
    : await tursoQuery(
      `SELECT id, ms_text, ms_guidance,
              section AS existing_section, topic AS existing_topic, subtopic AS existing_subtopic
       FROM questions
       WHERE (section IS NULL OR section = '') ${subjectWhere}
       LIMIT ?`,
      [limitVal]
    );

  // Resume mode: skip ids already completed in topic-progress-<subject>.json
  // Check mode ignores progress and re-runs already-classified rows.
  const existingById = new Map(rawRows.map(r => [r.id, r]));
  const doneSet = new Set(progressDoneSet);
  const questions = useContinue ? rawRows.filter(q => !doneSet.has(q.id)) : rawRows;

  if (typeof log === 'function') {
    const mode = CHECK_MODE ? 'check' : (RESET ? 'reset' : (useContinue ? 'continue' : 'normal'));
    log(`Mode: ${mode} | rawRows=${rawRows.length} | skipDone=${useContinue ? doneSet.size : 0} | turbo=${TURBO_MODE}`);
  }

  if (questions.length === 0) {
    console.log(CHECK_MODE
      ? 'No classified rows found for check mode.'
      : 'All questions classified. Use --reset to force full reclassification.');
    appendRunHistory({
      event: 'noop',
      runId,
      subject: SUBJECT_ID || null,
      syllabus: SYLLABUS_FILE || null,
      check: CHECK_MODE,
    });
    process.off('SIGINT', onSigInt);
    await new Promise(resolve => logStream.end(resolve));
    return;
  }

  // ── Start live dashboard ──────────────────────────────────────────────────────
  const subjectLabel = taxonomy.name ? `${taxonomy.name} (${taxonomy.syllabus})` : (SUBJECT_ID || 'all subjects');
  dashStart(subjectLabel, questions.length);
  log(`Using batch=${effectiveBatchSize} concurrency=${effectiveConcurrency} retries=${RETRY_PASSES} (providers=${PROVIDERS.length}, cliBatch=${BATCH_CLI || 'auto'}, cliConcurrency=${CONCURRENCY_CLI || 'auto'})`);
  periodicSaveTimer = setInterval(() => {
    if (!CHECK_MODE) {
      syncProgressArrays();
      saveProgressThrottled(progress, true);
    }
    log(`Heartbeat: done=${done} failed=${failed} fallbacks=${fallbacks}`);
  }, 15000);

  async function runPool(items, batchSize, concurrency, workerFn) {
    let idx = 0;
    // Stagger worker launches by 200 ms each so their first API calls are spread out
    // across time, preventing all workers from hammering the same provider at t=0.
    const workers = Array.from({ length: concurrency }, async (_, workerIdx) => {
      await sleep(Math.min(workerIdx * 150, 10000)); // stagger up to 10s — 150ms apart so 67 workers launch per second, all staggered
      while (true) {
        const start = idx;
        idx += batchSize;
        if (start >= items.length) return;
        await workerFn(items.slice(start, Math.min(start + batchSize, items.length)));
      }
    });
    await Promise.all(workers);
  }

  const processBatch = async (batch) => {
    try {
      // Classify — returns { classified: [{id,section,topic,subtopic,assessment_objectives,deprecated}], ... }
      const results = await classifyWithConsensus(batch, taxonomy);

      if (results.length === 0) {
        for (const q of batch) {
          failedIdsThisRun.add(q.id);
          if (!CHECK_MODE) progressFailedSet.add(q.id);
        }
        failed = failedIdsThisRun.size;
        syncProgressArrays();
        if (!CHECK_MODE) saveProgressThrottled(progress);
        return;
      }

      // Build Turso update statements
      const statements = [];
      for (const r of results) {
        if (!r || !r.id) continue;

        // Validate section/topic/subtopic against taxonomy
        const fixed = validateAndFix(taxonomy, r.section, r.topic, r.subtopic);
        if (!fixed) continue;

        if (fixed.fallback) { fallbacks++; dash.fallbacks = fallbacks; }

        // Serialise assessment objectives (array → JSON string)
        const aoJson = Array.isArray(r.assessment_objectives) && r.assessment_objectives.length
          ? JSON.stringify(r.assessment_objectives)
          : null;

        const depFlag = r.deprecated ? 1 : 0;

        if (!DRY_RUN) {
          statements.push({
            sql: `UPDATE questions
                  SET section = ?, topic = ?, subtopic = ?,
                      assessment_objectives = ?, deprecated = ?,
                      topics = ?
                  WHERE id = ?`,
            args: [
              fixed.section, fixed.topic, fixed.subtopic,
              aoJson, depFlag,
              [fixed.section, fixed.topic, fixed.subtopic].join('||'), // legacy topics column
              r.id,
            ],
          });
          updateLocalDb(r.id, fixed.section, fixed.topic, fixed.subtopic);
        } else {
          const aoStr = aoJson ? ` [${r.assessment_objectives.join(',')}]` : '';
          const dep   = depFlag ? ' ⚠DEPRECATED' : '';
          console.log(`  DRY: ${r.id} → ${fixed.section} > ${fixed.topic} > ${fixed.subtopic}${aoStr}${dep}`);
        }

        if (!CHECK_MODE) {
          progressDoneSet.add(r.id);
          progressFailedSet.delete(r.id);
          if (r.confidence != null) progress.confidenceMap[r.id] = r.confidence;
        } else {
          const prev = existingById.get(r.id);
          if (prev) {
            const changed = prev.existing_section !== fixed.section
              || prev.existing_topic !== fixed.topic
              || prev.existing_subtopic !== fixed.subtopic;
            if (changed) improved++;
            else unchanged++;
          }
        }
        failedIdsThisRun.delete(r.id);
        done++;
      }

      if (statements.length) {
        // Chunk to avoid Turso 100-statement limit per pipeline call
        for (let i = 0; i < statements.length; i += 50) {
          await tursoExec(statements.slice(i, i + 50));
        }
      }

      // Mark any batch items that got no result as failed
      const resultIds = new Set(results.map(r => r.id));
      for (const q of batch) {
        if (!resultIds.has(q.id)) {
          failedIdsThisRun.add(q.id);
          if (!CHECK_MODE) progressFailedSet.add(q.id);
        }
      }
      failed = failedIdsThisRun.size;

      syncProgressArrays();
      if (!CHECK_MODE) saveProgressThrottled(progress);

      // Update dashboard counters (the render interval will pick them up)
      dash.done      = done;
      dash.failed    = failed;
      dash.fallbacks = fallbacks;
    } catch (err) {
      if (typeof log === 'function') log(`Batch error: ${err.message}`);
      for (const q of batch) {
        failedIdsThisRun.add(q.id);
        if (!CHECK_MODE) progressFailedSet.add(q.id);
      }
      failed = failedIdsThisRun.size;
      dash.failed = failed;
      syncProgressArrays();
      if (!CHECK_MODE) saveProgressThrottled(progress);
    }
  };

  await runPool(questions, effectiveBatchSize, effectiveConcurrency, processBatch);

  for (let pass = 1; pass <= RETRY_PASSES; pass++) {
    if (failedIdsThisRun.size === 0) break;
    const retryQuestions = questions.filter(q => failedIdsThisRun.has(q.id));
    failedIdsThisRun.clear();
    log(`Retry pass ${pass}/${RETRY_PASSES}: retrying ${retryQuestions.length} unresolved questions`);
    const retryConcurrency = Math.max(1, Math.ceil(effectiveConcurrency * 0.75));
    // Halve batch size each retry pass — smaller batches survive truncation and weak providers
    const retryBatchSize = Math.max(5, Math.ceil(effectiveBatchSize / Math.pow(2, pass)));
    await runPool(retryQuestions, retryBatchSize, retryConcurrency, processBatch);
  }

  // ── Stop dashboard and print summary ─────────────────────────────────────────
  dashStop();
  console.log('═'.repeat(60));
  console.log(`✅  Done — ${taxonomy.name || SUBJECT_ID}:`);
  console.log(`   Classified: ${done}  Failed: ${failed}  Fuzzy matches: ${fallbacks}`);
  syncProgressArrays();
  if (CHECK_MODE) {
    console.log(`   Improved: ${improved}  Unchanged: ${unchanged}`);
  }
  if (!CHECK_MODE && progress.failed.length) {
    console.log(`   WARNING ${progress.failed.length} still failed - rerun to retry`);
  }
  if (!CHECK_MODE) saveProgressThrottled(progress, true);
  const providerSummary = Object.entries(providerQuestionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name}=${count}`)
    .join(', ');
  if (providerSummary) {
    log(`Provider question counts: ${providerSummary}`);
  }
  log(`Finished. done=${done} failed=${failed} fallbacks=${fallbacks} improved=${improved} unchanged=${unchanged}`);
  appendRunHistory({
    event: 'finish',
    runId,
    subject: SUBJECT_ID || null,
    syllabus: SYLLABUS_FILE || null,
    done,
    failed,
    fallbacks,
    improved,
    unchanged,
    durationSec: Math.round((Date.now() - startTime) / 1000),
    providerQuestionCounts,
  });
  process.off('SIGINT', onSigInt);
  if (periodicSaveTimer) clearInterval(periodicSaveTimer);
  await new Promise(resolve => logStream.end(resolve));
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });





