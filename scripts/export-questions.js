#!/usr/bin/env node
/**
 * export-questions.js
 * Exports questions from master.db into questions-db.js for the study website.
 *
 * Usage:
 *   node scripts/export-questions.js
 *
 * Requires:  npm install --save-dev better-sqlite3
 * Input:     database/master.db  (must exist)
 * Output:    questions-db.js     (loaded by the website before data.js)
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH   = path.join(__dirname, '..', 'database', 'master.db');
const OUT_PATH  = path.join(__dirname, '..', 'questions-db.js');

// ── Subject name → website subject ID ────────────────────────────────────────
function mapSubject(dbSubject, level) {
  const lvl = (level || '').toLowerCase();
  const isAS  = lvl.includes('as') || lvl.includes('a_level') || lvl.includes('alevel');
  const isA2  = lvl.includes('a2') || (isAS && lvl.includes('a2'));

  const PREFIX = isA2 ? 'a2' : isAS ? 'as' : 'igcse';

  const s = dbSubject || '';
  if (s.includes('Biology'))              return `${PREFIX}_bio`;
  if (s.includes('Chemistry'))            return `${PREFIX}_chem`;
  if (s.includes('Physics'))              return `${PREFIX}_phys`;
  if (s.includes('Further Math') || s.includes('Further Maths')) return `${PREFIX}_fm`;
  if (s.includes('Math') || s.includes('Maths')) return `${PREFIX}_maths`;
  if (s.includes('Computer'))             return `${PREFIX}_cs`;
  if (s.includes('Economics'))            return `${PREFIX}_econ`;
  if (s.includes('History'))              return `${PREFIX}_hist`;
  if (s.includes('Geography') || s.includes('Geo')) return `${PREFIX}_geog`;
  if (s.includes('English Literature') || s.includes('Lit')) return `${PREFIX}_englit`;
  if (s.includes('English Language') || s.includes('Language')) return `${PREFIX}_englang`;
  if (s.includes('Combined Science'))     return `${PREFIX}_cscience`;
  // Fallback: slugify
  return `${PREFIX}_${s.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
}

// ── Parse mark scheme text into array of mark points ─────────────────────────
function parseMarkScheme(msText, msGuidance) {
  const combined = [msText, msGuidance].filter(Boolean).join('\n').trim();
  if (!combined) return [];
  // Split on newlines, semicolons, or numbered list markers
  return combined
    .split(/\n|;|(?<=\d)\.\s/)
    .map(s => s.replace(/^\s*[\u2022\-\*\d\.]+\s*/, '').trim())
    .filter(s => s.length > 0);
}

// ── Main export ───────────────────────────────────────────────────────────────
function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`\n  ERROR: Database not found at:\n    ${DB_PATH}\n`);
    console.error('  Copy the database/ folder from your local machine first.\n');
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });

  // Check if topic_index exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  const hasTopicIndex = tables.includes('topic_index');

  const sql = hasTopicIndex
    ? `SELECT q.*, GROUP_CONCAT(ti.topic, '||') AS topic_list
       FROM questions q
       LEFT JOIN topic_index ti ON ti.question_id = q.id
       WHERE (q.needs_review = 0 OR q.needs_review IS NULL)
         AND q.question_pdf IS NOT NULL
       GROUP BY q.id`
    : `SELECT q.*, q.topics AS topic_list
       FROM questions q
       WHERE (q.needs_review = 0 OR q.needs_review IS NULL)
         AND q.question_pdf IS NOT NULL`;

  const rows = db.prepare(sql).all();
  db.close();

  console.log(`Found ${rows.length} questions in DB`);

  const questions = rows.map(row => {
    // Topics: either from topic_index join or topics column
    const topicRaw = row.topic_list || row.topics || '';
    const topics = topicRaw.split('||').map(t => t.trim()).filter(Boolean);
    const firstTopic = topics[0] || 'Past Paper';

    // Normalise the PDF path to use forward slashes and be relative to project root
    const pdfUrl = row.question_pdf
      ? row.question_pdf.replace(/\\/g, '/')
      : null;

    // questionType: treat is_mcq=1 as mcq, else short-answer
    // (MCQ options not stored in DB, so renderer shows PDF + text answer for all)
    const questionType = row.is_mcq ? 'mcq-image' : 'short-answer';

    return {
      id: String(row.id),
      subject: mapSubject(row.subject, row.level),
      topic: firstTopic,
      subtopic: topics[1] || firstTopic,
      questionType,
      difficulty: 'medium',
      marks: row.ms_marks || 1,
      prompt: null,   // no text — question is a PDF image
      pdfUrl,
      markScheme: parseMarkScheme(row.ms_text, row.ms_guidance),
      explanation: row.examiner_report || '',
      meta: {
        year:        row.year,
        session:     row.session_name || row.session,
        paper:       row.paper,
        questionNum: row.question_num,
        syllabusCode: row.syllabus_code,
        subject:     row.subject,
        level:       row.level,
      },
      tags: [
        'past-paper',
        row.year ? `${row.year}` : null,
        row.session ? row.session : null,
      ].filter(Boolean),
    };
  });

  // Count per subject for info
  const counts = {};
  for (const q of questions) {
    counts[q.subject] = (counts[q.subject] || 0) + 1;
  }
  console.log('\nQuestions per subject:');
  for (const [subj, count] of Object.entries(counts).sort()) {
    console.log(`  ${subj.padEnd(20)} ${count}`);
  }

  const output = `// Auto-generated by scripts/export-questions.js — do not edit manually
// Run: node scripts/export-questions.js   to regenerate

window.DB_QUESTIONS = ${JSON.stringify(questions, null, 2)};
`;

  fs.writeFileSync(OUT_PATH, output, 'utf8');
  console.log(`\nWrote ${questions.length} questions to questions-db.js`);
}

main();
