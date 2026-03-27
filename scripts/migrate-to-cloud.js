#!/usr/bin/env node
/**
 * migrate-to-cloud.js
 *
 * Uploads 200k+ past-paper questions from a local SQLite database to:
 *   - Turso (cloud SQLite) for question metadata
 *   - Cloudinary (free image hosting, no credit card) for JPEG question images
 *
 * Usage:
 *   1. Copy scripts/.env.migrate.example → scripts/.env.migrate and fill in credentials
 *   2. node scripts/migrate-to-cloud.js
 *   3. Script is resumable — run again after any interruption
 *
 * Progress is saved to scripts/migration-progress.json after every batch.
 */

const fs   = require('fs');
const path = require('path');

// ── Load .env.migrate ──────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '.env.migrate');
if (!fs.existsSync(envPath)) {
  console.error('❌  Missing scripts/.env.migrate — copy .env.migrate.example and fill in credentials.');
  process.exit(1);
}
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const {
  TURSO_URL, TURSO_TOKEN,
  CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
  DB_PATH, PDF_ROOT,
} = process.env;

for (const key of ['TURSO_URL','TURSO_TOKEN','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET','DB_PATH','PDF_ROOT']) {
  if (!process.env[key]) { console.error(`❌  Missing env var: ${key}`); process.exit(1); }
}

// ── Lazy-require heavy deps ────────────────────────────────────────────────────
let Database, sharp;
try { Database = require('better-sqlite3'); } catch { console.error('❌  Run: npm install better-sqlite3'); process.exit(1); }
try { sharp = require('sharp'); } catch { console.error('❌  Run: npm install sharp'); process.exit(1); }

// ── Constants ──────────────────────────────────────────────────────────────────
const BATCH_SIZE     = 50;   // PDFs uploaded in parallel per batch
const TURSO_BATCH    = 200;  // rows inserted per Turso request
const PROGRESS_FILE  = path.join(__dirname, 'migration-progress.json');

// ── Subject mapping ────────────────────────────────────────────────────────────
const SUBJECT_MAP = {
  'Biology-0610':            'igcse_bio',
  'Chemistry-0620':          'igcse_chem',
  'Physics-0625':            'igcse_phys',
  'Mathematics-0580':        'igcse_maths',
  'Computer Science-0478':   'igcse_cs',
  'Economics-0455':          'igcse_econ',
  'History-0470':            'igcse_hist',
  'Geography-0460':          'igcse_geog',
  'English Literature-0475': 'igcse_englit',
  'English Language-0500':   'igcse_englang',
  'English Language-0522':   'igcse_englang',
  'Combined Science-0653':   'igcse_cscience',
  'Biology-9700':            'as_bio',
  'Chemistry-9701':          'as_chem',
  'Further Mathematics-9231':'as_fm',  // refined by level below
};

function mapSubject(subject, level) {
  const lvl = (level || '').toLowerCase();
  // Physics-9702 and Mathematics-9709 and Economics-9708 split on level
  if (subject === 'Physics-9702')       return lvl.includes('a2') ? 'a2_phys' : 'as_phys';
  if (subject === 'Mathematics-9709')   return lvl.includes('a2') ? 'a2_maths' : 'as_maths';
  if (subject === 'Economics-9708')     return lvl.includes('a2') ? 'a2_econ' : 'as_econ';
  if (subject === 'Further Mathematics-9231') return lvl.includes('a2') ? 'a2_fm' : 'as_fm';
  return SUBJECT_MAP[subject] || null;
}

// ── Turso HTTP helper ──────────────────────────────────────────────────────────
async function tursoExec(statements) {
  // statements: array of { sql, args: [] }
  const requests = statements.map(s => ({ type: 'execute', stmt: { sql: s.sql, args: s.args || [] } }));
  requests.push({ type: 'close' });
  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Turso error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Cloudinary upload ──────────────────────────────────────────────────────────
const CLOUDINARY_BASE = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

async function uploadToCloudinary(questionId, imageBuffer, mimeType) {
  // Cloudinary upload via REST API — no SDK needed
  const base64 = imageBuffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;

  const body = new URLSearchParams({
    file:        dataUri,
    public_id:   `study-questions/${questionId}`,
    overwrite:   'false',
    api_key:     CLOUDINARY_API_KEY,
    timestamp:   String(Math.floor(Date.now() / 1000)),
  });

  // Generate signature: sha256(public_id=...&timestamp=...&CLOUDINARY_API_SECRET)
  const crypto = require('crypto');
  const toSign = `overwrite=false&public_id=study-questions/${questionId}&timestamp=${body.get('timestamp')}${CLOUDINARY_API_SECRET}`;
  body.set('signature', crypto.createHash('sha256').update(toSign).digest('hex'));

  const res = await fetch(CLOUDINARY_BASE, { method: 'POST', body });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Cloudinary ${res.status}: ${t}`);
  }
  const json = await res.json();
  // Return the optimised delivery URL (auto quality + format)
  return json.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
}

// ── PDF → JPEG conversion ──────────────────────────────────────────────────────
// sharp can't render PDFs — we use the pdf2pic / pdfjs-dist approach.
// Simplest: use sharp to just convert the first page of the PDF via poppler
// if available, otherwise fall back to reading the PDF as-is and marking for
// manual conversion.
async function pdfToJpeg(pdfPath) {
  // Try: use sharp with pdf input (requires libvips with PDF support / poppler)
  try {
    const jpegBuf = await sharp(pdfPath, { pages: 1 })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 85 })
      .toBuffer();
    return jpegBuf;
  } catch (e) {
    // Fallback: store the raw PDF buffer (browser will use PDF.js to render it)
    return fs.readFileSync(pdfPath);
  }
}

// ── Mark scheme parser ─────────────────────────────────────────────────────────
function parseMarkScheme(msText, msGuidance) {
  const parts = [];
  if (msText) {
    const lines = msText.split(/[\n;]+/).map(s => s.trim()).filter(Boolean);
    parts.push(...lines);
  }
  if (msGuidance) {
    const lines = msGuidance.split(/[\n;]+/).map(s => s.trim()).filter(Boolean);
    parts.push(...lines);
  }
  return parts.length ? parts : ['See mark scheme'];
}

// ── Progress tracking ──────────────────────────────────────────────────────────
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch {}
  }
  return { uploaded: [], failed: [], schemaCreated: false };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📚  Study Platform — Past Paper Migration');
  console.log('─'.repeat(50));

  // Open local DB
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌  Database not found: ${DB_PATH}`);
    process.exit(1);
  }
  const db = new Database(DB_PATH, { readonly: true });
  console.log('✓  Opened local database');

  // Load progress
  const progress = loadProgress();
  const uploadedSet = new Set(progress.uploaded);
  console.log(`✓  Resuming — ${uploadedSet.size} already uploaded`);

  // Create Turso schema
  if (!progress.schemaCreated) {
    console.log('⟳  Creating Turso schema...');
    await tursoExec([{
      sql: `CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        year INTEGER,
        session TEXT,
        session_name TEXT,
        paper TEXT,
        question_num TEXT,
        is_mcq INTEGER DEFAULT 0,
        ms_marks INTEGER DEFAULT 1,
        ms_text TEXT,
        ms_guidance TEXT,
        examiner_report TEXT,
        topics TEXT,
        pdf_url TEXT
      )`
    }, {
      sql: `CREATE INDEX IF NOT EXISTS idx_subject ON questions(subject_id)`
    }, {
      sql: `CREATE INDEX IF NOT EXISTS idx_subject_year ON questions(subject_id, year)`
    }]);
    progress.schemaCreated = true;
    saveProgress(progress);
    console.log('✓  Turso schema ready');
  }

  // Fetch all questions from local DB
  const rows = db.prepare(`
    SELECT q.id, q.level, q.subject, q.syllabus_code, q.year, q.session, q.session_name,
           q.paper, q.question_num, q.is_mcq, q.question_pdf,
           q.ms_text, q.ms_marks, q.ms_guidance, q.examiner_report,
           GROUP_CONCAT(ti.topic, '||') as topic_list
    FROM questions q
    LEFT JOIN topic_index ti ON ti.question_id = q.id
    WHERE q.needs_review = 0
      AND q.question_pdf IS NOT NULL
    GROUP BY q.id
    ORDER BY q.id
  `).all();

  const total = rows.length;
  console.log(`\n📋  ${total.toLocaleString()} questions to process`);
  console.log(`   Skipping ${uploadedSet.size} already done`);
  console.log(`   Remaining: ${(total - uploadedSet.size).toLocaleString()}\n`);

  let done = uploadedSet.size;
  let failed = progress.failed.length;

  // Process in batches
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).filter(r => !uploadedSet.has(r.id));
    if (batch.length === 0) continue;

    // Upload PDFs to R2 in parallel
    const results = await Promise.allSettled(batch.map(async row => {
      const subjectId = mapSubject(row.subject, row.level);
      if (!subjectId) throw new Error(`Unknown subject: ${row.subject}`);

      // Resolve PDF path
      const pdfPath = path.isAbsolute(row.question_pdf)
        ? row.question_pdf
        : path.join(PDF_ROOT, row.question_pdf);

      if (!fs.existsSync(pdfPath)) throw new Error(`PDF not found: ${pdfPath}`);

      // Convert PDF → JPEG and upload to Cloudinary
      const imgBuf = await pdfToJpeg(pdfPath);
      const isJpeg = imgBuf[0] === 0xFF && imgBuf[1] === 0xD8;
      const mime   = isJpeg ? 'image/jpeg' : 'application/pdf';

      const pdfUrl = await uploadToCloudinary(row.id, imgBuf, mime);
      const topics = row.topic_list ? row.topic_list.split('||').filter(Boolean) : [];
      const ms     = parseMarkScheme(row.ms_text, row.ms_guidance);

      return {
        id: row.id,
        subject_id: subjectId,
        year: row.year,
        session: row.session,
        session_name: row.session_name,
        paper: row.paper,
        question_num: row.question_num,
        is_mcq: row.is_mcq || 0,
        ms_marks: row.ms_marks || 1,
        ms_text: ms.join('\n'),
        ms_guidance: row.ms_guidance || '',
        examiner_report: row.examiner_report || '',
        topics: JSON.stringify(topics),
        pdf_url: pdfUrl,
      };
    }));

    // Collect successful rows for Turso insert
    const toInsert = [];
    for (let j = 0; j < batch.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled') {
        uploadedSet.add(batch[j].id);
        toInsert.push(r.value);
        done++;
      } else {
        progress.failed.push({ id: batch[j].id, error: r.reason?.message });
        failed++;
      }
    }

    // Insert to Turso in sub-batches
    for (let k = 0; k < toInsert.length; k += TURSO_BATCH) {
      const chunk = toInsert.slice(k, k + TURSO_BATCH);
      const stmts = chunk.map(q => ({
        sql: `INSERT OR REPLACE INTO questions
              (id,subject_id,year,session,session_name,paper,question_num,is_mcq,
               ms_marks,ms_text,ms_guidance,examiner_report,topics,pdf_url)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          q.id, q.subject_id, q.year, q.session, q.session_name,
          q.paper, q.question_num, q.is_mcq, q.ms_marks,
          q.ms_text, q.ms_guidance, q.examiner_report, q.topics, q.pdf_url,
        ],
      }));
      await tursoExec(stmts);
    }

    // Save progress and print status
    progress.uploaded = [...uploadedSet];
    saveProgress(progress);

    const pct = ((done / total) * 100).toFixed(1);
    process.stdout.write(`\r⟳  ${done.toLocaleString()} / ${total.toLocaleString()} (${pct}%) — ${failed} failed   `);
  }

  console.log('\n\n' + '─'.repeat(50));
  console.log(`✅  Migration complete`);
  console.log(`   Uploaded: ${done.toLocaleString()}`);
  console.log(`   Failed:   ${failed}`);
  if (failed > 0) {
    console.log(`   See scripts/migration-progress.json for failed IDs`);
  }
  console.log('\nNext steps:');
  console.log('  1. Open questions-api.js and fill in TURSO_URL and TURSO_READ_TOKEN');
  console.log('  2. Deploy the website — students can now access past paper questions');
}

main().catch(e => { console.error('\n❌ ', e.message); process.exit(1); });
