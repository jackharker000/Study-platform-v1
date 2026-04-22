#!/usr/bin/env node
/**
 * extract-parts.js
 *
 * Scans all questions in Turso where ms_text is populated but parts_json is NULL.
 * Parses mark schemes to extract per-part marks: {label, text, marks}[].
 * Stores result as JSON in the parts_json column.
 *
 * Strategy:
 *   1. Fast regex parse for standard Cambridge format: "(a)(i) text [2]"
 *   2. AI fallback (Gemini Flash via OpenRouter) for non-standard formats
 *
 * Usage:
 *   node scripts/extract-parts.js [--continue] [--dry-run] [--subject <id>] [--limit <n>]
 *
 * Requires: scripts/.env.migrate (TURSO_URL, TURSO_TOKEN, OPENROUTER_API_KEY)
 */

'use strict';

const fs   = require('fs');
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

const { TURSO_URL, TURSO_TOKEN } = process.env;
if (!TURSO_URL)   { console.error('❌  Missing TURSO_URL');   process.exit(1); }
if (!TURSO_TOKEN) { console.error('❌  Missing TURSO_TOKEN'); process.exit(1); }

// ── CLI args ───────────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const hasArg      = f => args.includes(f);
const getArg      = (f, def = null) => { const i = args.indexOf(f); return i !== -1 ? args[i+1] : def; };
const DRY_RUN     = hasArg('--dry-run');
const CONTINUE    = hasArg('--continue');
const SUBJECT_ID  = getArg('--subject');
const LIMIT       = getArg('--limit') ? parseInt(getArg('--limit')) : Infinity;
const BATCH_SIZE  = 50;

const PROGRESS_FILE = path.join(__dirname, 'parts-progress.json');

// ── Turso helpers ──────────────────────────────────────────────────────────────
const TURSO_HTTP = TURSO_URL.replace(/^libsql:\/\//, 'https://');

async function fetchT(url, opts = {}, timeoutMs = 30000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try   { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  catch (e) { if (e.name === 'AbortError') throw new Error('Turso timeout'); throw e; }
  finally   { clearTimeout(timer); }
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
  const res = await fetchT(`${TURSO_HTTP}/v2/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
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

// ── OpenRouter key pool ────────────────────────────────────────────────────────
function collectKeys(base, n) {
  const keys = [];
  const first = process.env[base];
  if (first) keys.push(first);
  for (let i = 2; i <= n; i++) {
    const k = process.env[`${base}_${i}`];
    if (k) keys.push(k);
  }
  return keys;
}

const OR_KEYS = collectKeys('OPENROUTER_API_KEY', 25);
let orCursor  = 0;
function nextOrKey() { return OR_KEYS[orCursor++ % OR_KEYS.length] || null; }

async function callAI(prompt) {
  if (!OR_KEYS.length) throw new Error('No OPENROUTER_API_KEY configured');
  const key = nextOrKey();
  const res = await fetchT('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      temperature: 0.1,
      max_tokens: 600,
      messages: [
        { role: 'system', content: 'You are a Cambridge examiner assistant. Extract question parts from mark schemes and respond ONLY with valid JSON.' },
        { role: 'user',   content: prompt },
      ],
    }),
  }, 20000);
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ── Part parser ────────────────────────────────────────────────────────────────

// Cambridge mark schemes join parts with " / " on a single line:
//   "1 (a) A – text [2] / (b) (i) Reasonably accurate plot [3] / (b)(ii) text [1]"
// Strategy: split on " / ", group segments starting with a part label, then
// extract the [N] marks notation from each group's tail.
const LABEL_RE = /^(?:\d+\s+)?(\([a-z]+\)(?:\s*\([ivxlcdm]+\))?)\s+/i;
const MARKS_RE = /\[(\d+)\]\s*$/;

function parsePartsRegex(msText) {
  if (!msText) return null;
  const segments = msText.split(/\s*\/\s*/);
  const parts = [];
  let current = null; // { label, rawText }

  for (const raw of segments) {
    const seg = raw.trim();
    const labelMatch = LABEL_RE.exec(seg);
    if (labelMatch) {
      // Flush previous part
      if (current) {
        const mm = MARKS_RE.exec(current.rawText);
        if (mm) parts.push({ label: current.label, text: current.rawText.replace(MARKS_RE, '').trim(), marks: parseInt(mm[1], 10) });
      }
      current = { label: labelMatch[1].replace(/\s+/g, ''), rawText: seg.slice(labelMatch[0].length).trim() };
    } else if (current) {
      current.rawText += ' / ' + seg;
    }
  }
  // Flush last part
  if (current) {
    const mm = MARKS_RE.exec(current.rawText);
    if (mm) parts.push({ label: current.label, text: current.rawText.replace(MARKS_RE, '').trim(), marks: parseInt(mm[1], 10) });
  }

  return parts.length >= 2 ? parts : null;
}

async function parsePartsAI(msText, questionId) {
  if (!OR_KEYS.length) return null;
  const prompt =
    `Extract question parts from this Cambridge mark scheme. ` +
    `Return a JSON array of objects: [{\"label\":\"(a)\",\"text\":\"description\",\"marks\":2},...]. ` +
    `Only include entries that correspond to distinct question parts with marks. ` +
    `If there are no separate parts (single-part question), return []. ` +
    `Mark scheme:\n\n${msText.slice(0, 1500)}`;
  try {
    const raw = await callAI(prompt);
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed) || parsed.length < 2) return null;
    return parsed.filter(p => p.label && p.marks > 0);
  } catch (err) {
    console.warn(`  [ai-fallback] failed for ${questionId}: ${err.message}`);
    return null;
  }
}

// ── Progress tracking ──────────────────────────────────────────────────────────

function loadProgress() {
  if (!CONTINUE || !fs.existsSync(PROGRESS_FILE)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    return new Set(data.done || []);
  } catch { return new Set(); }
}

function saveProgress(done) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ done: [...done], updatedAt: new Date().toISOString() }), 'utf8');
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍  extract-parts.js starting…');
  if (DRY_RUN) console.log('   [DRY RUN — no DB writes]');

  const done = loadProgress();
  console.log(`   Resuming: ${done.size} already processed.`);

  // Ensure parts_json column exists (idempotent)
  try {
    await tursoExec([{ sql: 'ALTER TABLE questions ADD COLUMN parts_json TEXT', args: [] }]);
    console.log('   ✓ Added parts_json column');
  } catch (e) {
    if (!String(e).includes('duplicate column') && !String(e).includes('already exists')) {
      console.warn('   Column check warning:', e.message);
    }
  }

  // Fetch questions needing processing
  const whereParts = ['q.ms_text IS NOT NULL', "q.ms_text != ''", 'q.parts_json IS NULL'];
  if (SUBJECT_ID) whereParts.push(`q.subject_id = '${SUBJECT_ID}'`);
  const whereClause = 'WHERE ' + whereParts.join(' AND ');

  const questions = await tursoQuery(
    `SELECT id, ms_text, ms_marks FROM questions q ${whereClause} LIMIT 50000`,
    []
  );

  const todo = questions.filter(q => !done.has(q.id)).slice(0, LIMIT);
  console.log(`   Found ${todo.length} questions to process (${questions.length - todo.length} skipped by progress).`);

  let processed = 0, regexHits = 0, aiHits = 0, singlePart = 0;

  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    const updates = [];

    for (const q of batch) {
      if (done.has(q.id)) continue;
      const msText = q.ms_text || '';

      // 1. Try fast regex parse
      let parts = parsePartsRegex(msText);
      if (parts) {
        regexHits++;
      } else {
        // 2. AI fallback for non-standard formats
        parts = await parsePartsAI(msText, q.id);
        if (parts) aiHits++;
        else       singlePart++;
      }

      if (parts) {
        updates.push({ sql: 'UPDATE questions SET parts_json = ? WHERE id = ?', args: [JSON.stringify(parts), q.id] });
      }
      done.add(q.id);
      processed++;
    }

    if (!DRY_RUN && updates.length) {
      await tursoExec(updates);
    }
    saveProgress(done);

    const pct = Math.round(((i + batch.length) / todo.length) * 100);
    console.log(`   ${pct}% — ${i + batch.length}/${todo.length} | regex:${regexHits} ai:${aiHits} single:${singlePart}`);
  }

  console.log(`\n✅  Done. Processed ${processed} questions.`);
  console.log(`   Multipart (regex): ${regexHits}`);
  console.log(`   Multipart (AI):    ${aiHits}`);
  console.log(`   Single-part:       ${singlePart}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
