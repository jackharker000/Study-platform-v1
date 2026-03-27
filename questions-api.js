/**
 * questions-api.js
 *
 * Frontend client for fetching past-paper questions from Turso.
 * Uses Turso's HTTP pipeline API — no SDK or bundler needed.
 * Include this script before data.js in every HTML page.
 *
 * After running scripts/migrate-to-cloud.js, fill in the two constants below:
 */

// ── Config — fill these in after migration ────────────────────────────────────
const TURSO_DB_URL    = '';   // e.g. 'https://study-questions-yourname.turso.io'
const TURSO_READ_TOKEN = '';  // read-only token (safe to expose in frontend)
// ─────────────────────────────────────────────────────────────────────────────

const _CACHE_PREFIX = 'rp-turso-';
const _CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

function _cacheKey(k) { return _CACHE_PREFIX + k; }

function _readCache(k) {
  try {
    const raw = sessionStorage.getItem(_cacheKey(k));
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > _CACHE_TTL_MS) { sessionStorage.removeItem(_cacheKey(k)); return null; }
    return data;
  } catch { return null; }
}

function _writeCache(k, data) {
  try { sessionStorage.setItem(_cacheKey(k), JSON.stringify({ ts: Date.now(), data })); } catch {}
}

/** Execute one or more SQL statements via Turso HTTP API. */
async function _tursoQuery(sql, args = []) {
  if (!TURSO_DB_URL || !TURSO_READ_TOKEN) return null;
  try {
    const res = await fetch(`${TURSO_DB_URL}/v2/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TURSO_READ_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          { type: 'execute', stmt: { sql, args: args.map(v => ({ type: typeof v === 'number' ? 'integer' : 'text', value: String(v) })) } },
          { type: 'close' },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json.results?.[0];
    if (!result || result.type === 'error') return null;
    const cols = result.response.result.cols.map(c => c.name);
    return result.response.result.rows.map(row =>
      Object.fromEntries(cols.map((c, i) => [c, row[i]?.value ?? null]))
    );
  } catch { return null; }
}

/** Convert a raw Turso row to the website question shape. */
function _rowToQuestion(row) {
  const topics = (() => { try { return JSON.parse(row.topics || '[]'); } catch { return []; } })();
  const ms     = (row.ms_text || '').split('\n').map(s => s.trim()).filter(Boolean);
  return {
    id:           row.id,
    subject:      row.subject_id,
    topic:        topics[0] || 'Past Paper',
    subtopic:     topics[1] || topics[0] || 'Past Paper',
    questionType: row.is_mcq === '1' || row.is_mcq === 1 ? 'mcq' : 'short-answer',
    difficulty:   'medium',
    marks:        parseInt(row.ms_marks) || 1,
    prompt:       null,           // image question — no text
    pdfUrl:       row.pdf_url,    // R2 public URL (jpg or pdf)
    markScheme:   ms.length ? ms : ['See mark scheme'],
    explanation:  row.examiner_report || '',
    meta: {
      year:        row.year,
      session:     row.session_name || row.session,
      paper:       row.paper,
      questionNum: row.question_num,
    },
    tags: ['past-paper', `${row.year}-${row.session}`].filter(Boolean),
  };
}

/**
 * Fetch a page of questions for a subject.
 * @param {string} subjectId  - e.g. 'igcse_bio'
 * @param {object} opts
 * @param {string} [opts.topic]    - filter by topic text (partial match)
 * @param {number} [opts.year]     - filter by year
 * @param {number} [opts.page=0]   - page index (0-based)
 * @param {number} [opts.limit=20] - questions per page
 * @returns {Promise<object[]>} array of question objects
 */
window.fetchQuestionsForSubject = async function(subjectId, { topic, year, page = 0, limit = 20 } = {}) {
  const cKey = `qs:${subjectId}:${topic||''}:${year||''}:${page}:${limit}`;
  const cached = _readCache(cKey);
  if (cached) return cached;

  let sql = 'SELECT * FROM questions WHERE subject_id = ?';
  const args = [subjectId];
  if (topic) { sql += ' AND topics LIKE ?'; args.push(`%${topic}%`); }
  if (year)  { sql += ' AND year = ?';       args.push(year); }
  sql += ` ORDER BY year DESC, id LIMIT ? OFFSET ?`;
  args.push(limit, page * limit);

  const rows = await _tursoQuery(sql, args);
  if (!rows) return [];
  const qs = rows.map(_rowToQuestion);
  _writeCache(cKey, qs);
  return qs;
};

/**
 * Fetch a single question by ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
window.fetchQuestionById = async function(id) {
  const cKey = `q:${id}`;
  const cached = _readCache(cKey);
  if (cached) return cached;

  const rows = await _tursoQuery('SELECT * FROM questions WHERE id = ? LIMIT 1', [id]);
  if (!rows || !rows.length) return null;
  const q = _rowToQuestion(rows[0]);
  _writeCache(cKey, q);
  return q;
};

/**
 * Fetch the list of distinct topics for a subject (for filter dropdowns).
 * @param {string} subjectId
 * @returns {Promise<string[]>} sorted topic names
 */
window.fetchTopicsForSubject = async function(subjectId) {
  const cKey = `topics:${subjectId}`;
  const cached = _readCache(cKey);
  if (cached) return cached;

  const rows = await _tursoQuery(
    'SELECT DISTINCT topics FROM questions WHERE subject_id = ? AND topics IS NOT NULL',
    [subjectId]
  );
  if (!rows) return [];

  const topicSet = new Set();
  for (const row of rows) {
    try {
      const arr = JSON.parse(row.topics || '[]');
      for (const t of arr) if (t) topicSet.add(t);
    } catch {}
  }
  const result = [...topicSet].sort();
  _writeCache(cKey, result);
  return result;
};

/**
 * Fetch total question count for a subject (for display on subject card).
 * @param {string} subjectId
 * @returns {Promise<number>}
 */
window.fetchQuestionCount = async function(subjectId) {
  const cKey = `count:${subjectId}`;
  const cached = _readCache(cKey);
  if (cached !== null) return cached;

  const rows = await _tursoQuery(
    'SELECT COUNT(*) as n FROM questions WHERE subject_id = ?',
    [subjectId]
  );
  const n = rows ? (parseInt(rows[0]?.n) || 0) : 0;
  _writeCache(cKey, n);
  return n;
};

/**
 * Returns true if Turso is configured (credentials filled in).
 */
window.hasPastPaperDB = function() {
  return !!(TURSO_DB_URL && TURSO_READ_TOKEN);
};
