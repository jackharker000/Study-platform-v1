#!/usr/bin/env node
/**
 * migrate-to-cloud.js
 *
 * Uploads past-paper questions from a local SQLite database to:
 *   - Turso (cloud SQLite) for question metadata
 *   - Cloudinary (free image hosting) for question PDF images
 *
 * Uses only pure-JS dependencies — no C++ build tools required on Windows.
 *
 * Usage:
 *   node scripts/migrate-to-cloud.js
 *   node scripts/migrate-to-cloud.js --limit 10   (test with 10 questions first)
 */

const fs   = require('fs');
const path = require('path');

// ── Load .env.migrate ──────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '.env.migrate');
if (!fs.existsSync(envPath)) {
  console.error('❌  Missing scripts/.env.migrate');
  process.exit(1);
}
const envRaw = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '').replace(/\r/g, '');
for (const line of envRaw.split('\n')) {
  const eq = line.indexOf('=');
  if (eq < 1) continue;
  const key = line.slice(0, eq).trim();
  const val = line.slice(eq + 1).trim();
  if (/^[A-Z0-9_]+$/.test(key)) process.env[key] = val;
}

const {
  TURSO_URL, TURSO_TOKEN,
  CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
  DB_PATH, PDF_ROOT,
} = process.env;

for (const key of ['TURSO_URL','TURSO_TOKEN','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET','DB_PATH','PDF_ROOT']) {
  if (!process.env[key]) { console.error(`❌  Missing: ${key}`); process.exit(1); }
}

// ── Limit flag ─────────────────────────────────────────────────────────────────
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : Infinity;

// ── Lazy-require ───────────────────────────────────────────────────────────────
let initSqlJs;
try { initSqlJs = require('sql.js'); } catch {
  console.error('❌  Run: npm install sql.js');
  process.exit(1);
}

// ── Constants ──────────────────────────────────────────────────────────────────
const BATCH_SIZE    = 3;    // parallel Cloudinary uploads per batch (low to avoid 429s)
const TURSO_BATCH   = 100;  // rows per Turso insert
const BATCH_DELAY   = 300;  // ms pause between batches to stay under rate limits
const PROGRESS_FILE = path.join(__dirname, 'migration-progress.json');

// ── Helpers ────────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Subject ID / name / icon / color — auto-generated from DB ─────────────────
function mapSubject(subject, level) {
  const code = subject.match(/-([A-Z0-9]+)$/i)?.[1];
  if (!code) return null;
  const lvl = level === 'IGCSE' ? 'igcse' : level === 'AS_Level' ? 'as' : level === 'A2_Level' ? 'a2' : null;
  if (!lvl) return null;
  return `${lvl}_${code.toLowerCase()}`;
}

function cleanName(subject) {
  return subject.replace(/-[A-Z0-9]+$/i, '').replace(/\d+$/, '').trim()
    .replace(/\bIct\b/g, 'ICT').replace(/\bIt\b/g, 'IT');
}

function subjectIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('biology'))                        return '🔬';
  if (n.includes('chemistry'))                      return '⚗️';
  if (n.includes('physics') || n.includes('physical science')) return '⚡';
  if (n.includes('math'))                           return '📐';
  if (n.includes('computer') || n.includes('computing') || n.includes('ict') || n.includes('information tech')) return '💻';
  if (n.includes('english') && n.includes('lit'))   return '📖';
  if (n.includes('english') || n.includes('language')) return '✍️';
  if (n.includes('history'))                        return '🏛️';
  if (n.includes('geography'))                      return '🌍';
  if (n.includes('economics'))                      return '📈';
  if (n.includes('accounting'))                     return '🧾';
  if (n.includes('business'))                       return '💼';
  if (n.includes('psychology'))                     return '🧠';
  if (n.includes('sociology'))                      return '👥';
  if (n.includes('law'))                            return '⚖️';
  if (n.includes('art') || n.includes('design'))    return '🎨';
  if (n.includes('music'))                          return '🎵';
  if (n.includes('drama'))                          return '🎭';
  if (n.includes('physical ed') || n.includes('sport')) return '⚽';
  if (n.includes('french'))                         return '🇫🇷';
  if (n.includes('german'))                         return '🇩🇪';
  if (n.includes('spanish'))                        return '🇪🇸';
  if (n.includes('chinese'))                        return '🇨🇳';
  if (n.includes('arabic'))                         return '🌙';
  if (n.includes('travel') || n.includes('tourism')) return '✈️';
  if (n.includes('food') || n.includes('nutrition')) return '🍎';
  if (n.includes('media'))                          return '📺';
  if (n.includes('thinking') || n.includes('general paper')) return '🧩';
  if (n.includes('environment') || n.includes('marine') || n.includes('science')) return '🌿';
  if (n.includes('religion') || n.includes('islam') || n.includes('divinity') || n.includes('hinduism')) return '🕌';
  return '📋';
}

function subjectColor(name) {
  const n = name.toLowerCase();
  if (n.includes('biology') || n.includes('marine') || n.includes('environment')) return '#16a34a';
  if (n.includes('chemistry'))                      return '#9333ea';
  if (n.includes('physics') || n.includes('physical science')) return '#2563eb';
  if (n.includes('math'))                           return '#0891b2';
  if (n.includes('computer') || n.includes('computing') || n.includes('ict') || n.includes('information tech')) return '#06b6d4';
  if (n.includes('history'))                        return '#b45309';
  if (n.includes('geography'))                      return '#15803d';
  if (n.includes('economics'))                      return '#0d9488';
  if (n.includes('accounting') || n.includes('business')) return '#0284c7';
  if (n.includes('english') || n.includes('literature')) return '#7c3aed';
  if (n.includes('psychology') || n.includes('sociology')) return '#db2777';
  if (n.includes('law'))                            return '#4b5563';
  if (n.includes('art') || n.includes('drama') || n.includes('music') || n.includes('design')) return '#ea580c';
  if (n.includes('french') || n.includes('german') || n.includes('spanish') || n.includes('chinese') || n.includes('arabic')) return '#6d28d9';
  if (n.includes('religion') || n.includes('islam') || n.includes('divinity') || n.includes('hinduism')) return '#854d0e';
  return '#6b7280';
}

// ── Turso HTTP helper ──────────────────────────────────────────────────────────
// Convert libsql:// URL → https:// for HTTP API
const TURSO_HTTP = TURSO_URL.replace(/^libsql:\/\//, 'https://');

async function tursoExec(statements) {
  const requests = statements.map(s => ({
    type: 'execute',
    stmt: { sql: s.sql, args: (s.args || []).map(v =>
      v === null ? { type: 'null' } :
      typeof v === 'number' ? { type: 'integer', value: String(v) } :
      { type: 'text', value: String(v) }
    )}
  }));
  requests.push({ type: 'close' });

  const res = await fetch(`${TURSO_HTTP}/v2/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) throw new Error(`Turso ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Cloudinary upload ──────────────────────────────────────────────────────────
const crypto = require('crypto');

async function uploadToCloudinary(questionId, fileBuffer, attempt = 0) {
  const base64   = fileBuffer.toString('base64');
  const dataUri  = `data:application/pdf;base64,${base64}`;
  const publicId = `study-questions/${questionId}`;
  const timestamp = String(Math.floor(Date.now() / 1000));

  // Signature: sha256 of sorted params + secret
  const toSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash('sha256').update(toSign).digest('hex');

  const body = new URLSearchParams({
    file: dataUri, public_id: publicId,
    timestamp, api_key: CLOUDINARY_API_KEY, signature,
  });

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body }
  );

  // Retry on rate limit (429) or server errors (5xx) — up to 4 times
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    const wait = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s, 16s
    await sleep(wait);
    return uploadToCloudinary(questionId, fileBuffer, attempt + 1);
  }

  if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${await res.text()}`);
  const json = await res.json();
  // Return URL that renders page 1 of the PDF as a JPEG automatically
  return json.secure_url.replace('/upload/', '/upload/pg_1,f_jpg,q_auto,w_900/');
}

// ── Mark scheme parser ─────────────────────────────────────────────────────────
function parseMarkScheme(msText, msGuidance) {
  const parts = [];
  if (msText)     parts.push(...msText.split(/[\n;]+/).map(s => s.trim()).filter(Boolean));
  if (msGuidance) parts.push(...msGuidance.split(/[\n;]+/).map(s => s.trim()).filter(Boolean));
  return parts.length ? parts.join('\n') : 'See mark scheme';
}

// ── Progress ───────────────────────────────────────────────────────────────────
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch {}
  }
  return { uploaded: [], failed: [], schemaCreated: false };
}
function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📚  Study Platform — Past Paper Migration');
  console.log('─'.repeat(50));

  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌  Database not found: ${DB_PATH}`);
    process.exit(1);
  }

  // Load SQLite via sql.js (pure JS — no native build needed)
  console.log('⟳  Loading database into memory...');
  const SQL   = await initSqlJs();
  const dbBuf = fs.readFileSync(DB_PATH);
  const db    = new SQL.Database(dbBuf);
  console.log('✓  Database loaded');

  const progress    = loadProgress();
  const uploadedSet = new Set(progress.uploaded);
  // Move previously-failed IDs back to the retry pool (clear the failed list)
  const prevFailed = progress.failed.length;
  progress.failed = [];
  console.log(`✓  ${uploadedSet.size} already uploaded${prevFailed ? `, ${prevFailed} previously-failed questions will be retried` : ''} — resuming`);

  // Create Turso schema once
  if (!progress.schemaCreated) {
    console.log('⟳  Creating Turso schema...');
    await tursoExec([
      { sql: `CREATE TABLE IF NOT EXISTS questions (
          id TEXT PRIMARY KEY, subject_id TEXT NOT NULL,
          year INTEGER, session TEXT, session_name TEXT, paper TEXT,
          question_num TEXT, is_mcq INTEGER DEFAULT 0,
          ms_marks INTEGER DEFAULT 1, ms_text TEXT, ms_guidance TEXT,
          examiner_report TEXT, topics TEXT, pdf_url TEXT
        )` },
      { sql: `CREATE TABLE IF NOT EXISTS subjects (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, level TEXT NOT NULL,
          syllabus TEXT, icon TEXT, color TEXT, question_count INTEGER DEFAULT 0
        )` },
      { sql: `CREATE INDEX IF NOT EXISTS idx_subject ON questions(subject_id)` },
      { sql: `CREATE INDEX IF NOT EXISTS idx_subject_year ON questions(subject_id, year)` },
    ]);
    progress.schemaCreated = true;
    saveProgress(progress);
    console.log('✓  Turso schema ready');
  }

  // Query all questions
  const result = db.exec(`
    SELECT q.id, q.level, q.subject, q.year, q.session, q.session_name,
           q.paper, q.question_num, q.is_mcq, q.question_pdf,
           q.ms_text, q.ms_marks, q.ms_guidance, q.examiner_report,
           GROUP_CONCAT(ti.topic, '||') as topic_list
    FROM questions q
    LEFT JOIN topic_index ti ON ti.question_id = q.id
    WHERE q.needs_review = 0 AND q.question_pdf IS NOT NULL
    GROUP BY q.id ORDER BY q.id
  `);

  if (!result.length) { console.error('❌  No questions found in DB'); process.exit(1); }

  const cols = result[0].columns;
  const rows = result[0].values.map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
  const toProcess = rows.filter(r => !uploadedSet.has(r.id)).slice(0, LIMIT);

  console.log(`\n📋  ${rows.length.toLocaleString()} total  |  ${uploadedSet.size} done  |  ${toProcess.length.toLocaleString()} to upload\n`);

  let done = uploadedSet.size;
  let failed = progress.failed.length;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(batch.map(async row => {
      const subjectId = mapSubject(row.subject, row.level);
      if (!subjectId) return null; // skip subjects not on the website

      const pdfPath = path.isAbsolute(row.question_pdf)
        ? row.question_pdf
        : path.join(PDF_ROOT, row.question_pdf);

      if (!fs.existsSync(pdfPath)) throw new Error(`PDF not found: ${pdfPath}`);

      const pdfBuf = fs.readFileSync(pdfPath);
      const pdfUrl = await uploadToCloudinary(row.id, pdfBuf);
      const topics = row.topic_list ? row.topic_list.split('||').filter(Boolean) : [];
      const name   = cleanName(row.subject);
      const lvl    = row.level === 'IGCSE' ? 'igcse' : row.level === 'AS_Level' ? 'as' : 'a2';
      const code   = row.subject.match(/-([A-Z0-9]+)$/i)?.[1] || '';

      return {
        id: row.id, subject_id: subjectId,
        _subjectMeta: { id: subjectId, name, level: lvl, syllabus: code, icon: subjectIcon(name), color: subjectColor(name) },
        year: row.year, session: row.session, session_name: row.session_name,
        paper: row.paper, question_num: row.question_num,
        is_mcq: row.is_mcq || 0, ms_marks: row.ms_marks || 1,
        ms_text: parseMarkScheme(row.ms_text, row.ms_guidance),
        ms_guidance: row.ms_guidance || '',
        examiner_report: row.examiner_report || '',
        topics: JSON.stringify(topics),
        pdf_url: pdfUrl,
      };
    }));

    // Insert successful rows to Turso
    const toInsert = [];
    for (let j = 0; j < batch.length; j++) {
      if (results[j].status === 'fulfilled') {
        uploadedSet.add(batch[j].id);
        if (results[j].value !== null) {
          toInsert.push(results[j].value);
          done++;
        }
        // null = skipped (unknown subject) — still mark as processed
      } else {
        progress.failed.push({ id: batch[j].id, error: results[j].reason?.message });
        failed++;
      }
    }

    // Upsert subject metadata (once per unique subject seen)
    const seenSubjects = new Map();
    for (const q of toInsert) {
      if (q._subjectMeta && !seenSubjects.has(q._subjectMeta.id)) {
        seenSubjects.set(q._subjectMeta.id, q._subjectMeta);
      }
    }
    if (seenSubjects.size) {
      await tursoExec([...seenSubjects.values()].map(s => ({
        sql: `INSERT OR IGNORE INTO subjects (id,name,level,syllabus,icon,color,question_count)
              VALUES (?,?,?,?,?,?,0)`,
        args: [s.id, s.name, s.level, s.syllabus, s.icon, s.color],
      })));
      // Increment question counts
      await tursoExec([...seenSubjects.keys()].map(id => ({
        sql: `UPDATE subjects SET question_count = question_count + ? WHERE id = ?`,
        args: [toInsert.filter(q => q.subject_id === id).length, id],
      })));
    }

    for (let k = 0; k < toInsert.length; k += TURSO_BATCH) {
      const chunk = toInsert.slice(k, k + TURSO_BATCH);
      await tursoExec(chunk.map(q => ({
        sql: `INSERT OR REPLACE INTO questions
              (id,subject_id,year,session,session_name,paper,question_num,
               is_mcq,ms_marks,ms_text,ms_guidance,examiner_report,topics,pdf_url)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [q.id,q.subject_id,q.year,q.session,q.session_name,q.paper,
               q.question_num,q.is_mcq,q.ms_marks,q.ms_text,q.ms_guidance,
               q.examiner_report,q.topics,q.pdf_url],
      })));
    }

    progress.uploaded = [...uploadedSet];
    saveProgress(progress);

    const total = rows.length;
    await sleep(BATCH_DELAY);
    const pct = ((done / total) * 100).toFixed(1);
    process.stdout.write(`\r⟳  ${done.toLocaleString()} / ${total.toLocaleString()} (${pct}%) — ${failed} failed   `);
  }

  console.log('\n\n' + '─'.repeat(50));
  console.log(`✅  Done — ${done.toLocaleString()} uploaded, ${failed} failed`);
  if (failed > 0) console.log('   Check scripts/migration-progress.json for failed IDs');
}

main().catch(e => { console.error('\n❌ ', e.message); process.exit(1); });
