'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CloudQuestion, GradeResult, SessionMode } from '@/types'
import { Button, Badge, ProgressBar } from '@/components/ui'
import { generateExamTip } from '@/lib/grading'
import { getSession, recordAnswer } from '@/lib/sessionStore'

// ─── Types ────────────────────────────────────────────────────────

interface QuizState {
  sessionId: string
  mode: SessionMode
  questions: CloudQuestion[]
  currentIdx: number
  answers: Record<number, AnsweredQuestion>
  status: 'loading' | 'active' | 'completed'
}

interface AnsweredQuestion {
  userAnswer: string
  gradeResult: GradeResult
  confidence?: string
  timeMs: number
}

interface PendingInput {
  mcqSelected: string | null  // 'A'|'B'|'C'|'D' for cloud MCQ
  textValue: string
  confidence: string | null
  hintShown: boolean
  flashcardFlipped: boolean
  startTime: number
}

// ─── Component ────────────────────────────────────────────────────

function QuizInner() {
  const router = useRouter()
  const params = useSearchParams()
  const sessionId = params.get('id') ?? ''

  const [quiz, setQuiz] = useState<QuizState | null>(null)
  const [pending, setPending] = useState<PendingInput>({
    mcqSelected: null, textValue: '', confidence: null,
    hintShown: false, flashcardFlipped: false, startTime: Date.now(),
  })
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load session on mount
  useEffect(() => {
    if (!sessionId) { router.push('/'); return }
    const session = getSession(sessionId)
    if (!session) { router.push('/'); return }
    setQuiz({
      sessionId,
      mode: session.mode as SessionMode,
      questions: session.questions,
      currentIdx: 0,
      answers: {},
      status: 'active',
    })
    setPending(p => ({ ...p, startTime: Date.now() }))
  }, [sessionId, router])

  const currentQ = quiz?.questions[quiz.currentIdx]
  const currentAnswer = quiz?.answers[quiz?.currentIdx ?? -1]
  const isAnswered = !!currentAnswer

  // Submit answer
  const submitAnswer = useCallback(async () => {
    if (!quiz || !currentQ || isAnswered || submitting) return

    const isMcq = currentQ.isMcq
    const userAnswer = isMcq ? (pending.mcqSelected ?? '') : pending.textValue
    if (isMcq && !pending.mcqSelected) return

    setSubmitting(true)
    try {
      let gradeResult: GradeResult

      if (isMcq) {
        // Client-side MCQ grading via /api/grade
        const res = await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: currentQ.id,
            userAnswer,
            isMcq: true,
            msText: currentQ.msText,
            msMarks: currentQ.msMarks,
          }),
        })
        gradeResult = await res.json() as GradeResult
      } else {
        // Non-MCQ: AI grading via /api/grade
        const res = await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: currentQ.id,
            userAnswer,
            isMcq: false,
            msText: currentQ.msText,
            msMarks: currentQ.msMarks,
            imageUrl: currentQ.imageUrl,
          }),
        })
        gradeResult = await res.json() as GradeResult
      }

      const timeMs = Date.now() - pending.startTime
      recordAnswer({
        sessionId: quiz.sessionId,
        questionId: currentQ.id,
        subject: currentQ.subject,
        topic: currentQ.topics[0] ?? 'General',
        userAnswer,
        gradeResult,
        confidence: pending.confidence ?? undefined,
        timeMs,
      })

      setQuiz(q => q ? {
        ...q,
        answers: {
          ...q.answers,
          [q.currentIdx]: { userAnswer, gradeResult, confidence: pending.confidence ?? undefined, timeMs },
        },
      } : q)
    } finally {
      setSubmitting(false)
    }
  }, [quiz, currentQ, isAnswered, submitting, pending])

  // Next question
  function goNext() {
    if (!quiz) return
    if (quiz.currentIdx + 1 >= quiz.questions.length) {
      router.push(`/results?id=${quiz.sessionId}`)
      return
    }
    setQuiz(q => q ? { ...q, currentIdx: q.currentIdx + 1 } : q)
    setPending({ mcqSelected: null, textValue: '', confidence: null, hintShown: false, flashcardFlipped: false, startTime: Date.now() })
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!quiz || !currentQ) return
      if (quiz.mode === 'flashcard') {
        if (e.key === ' ' || (e.key === 'Enter' && document.activeElement?.tagName !== 'TEXTAREA')) {
          e.preventDefault()
          setPending(p => ({ ...p, flashcardFlipped: !p.flashcardFlipped }))
        }
        if (e.key === 'ArrowRight') goNext()
        if (e.key === 'ArrowLeft') goPrev()
        return
      }
      if (currentQ.isMcq && !isAnswered && ['a','b','c','d'].includes(e.key.toLowerCase())) {
        setPending(p => ({ ...p, mcqSelected: e.key.toUpperCase() }))
      }
      if (e.key === 'Enter' && document.activeElement?.tagName !== 'TEXTAREA') {
        if (!isAnswered) { e.preventDefault(); void submitAnswer() }
        else { e.preventDefault(); goNext() }
      }
      if (e.key === 'ArrowRight' && isAnswered) goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, currentQ, isAnswered, pending, submitAnswer])

  if (!quiz || quiz.status === 'loading') {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '60px 16px', textAlign: 'center', color: 'var(--text-dim)' }}>
        Loading…
      </div>
    )
  }

  function goPrev() {
    if (!quiz || quiz.currentIdx === 0) return
    setQuiz(q => q ? { ...q, currentIdx: q.currentIdx - 1 } : q)
    setPending(p => ({ ...p, flashcardFlipped: false }))
  }

  if (quiz.mode === 'flashcard' && currentQ) {
    return <FlashcardView quiz={quiz} pending={pending} setPending={setPending} goNext={goNext} goPrev={goPrev} />
  }

  if (!currentQ) return null

  const answeredCount = Object.keys(quiz.answers).length
  const correctCount = Object.values(quiz.answers).filter(a => a.gradeResult.correct === true).length
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '20px 16px 100px' }}>
      <ProgressBar
        value={quiz.currentIdx + (isAnswered ? 1 : 0)}
        max={quiz.questions.length}
        label={`${quiz.currentIdx + 1} / ${quiz.questions.length}`}
        sublabel={answeredCount > 0 ? `${accuracy}% · ${correctCount}/${answeredCount}` : undefined}
      />

      <div
        className="fade-in"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px',
        }}
      >
        {/* Question metadata */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          <Badge label={currentQ.isMcq ? 'mcq' : 'structured'} kind="type" />
          {currentQ.topics[0] && <Badge label={currentQ.topics[0]} kind="topic" />}
          {currentQ.msMarks != null && currentQ.msMarks > 1 && (
            <Badge label={`${currentQ.msMarks} marks`} kind="marks" />
          )}
        </div>

        <div style={{ fontSize: '.72rem', color: 'var(--text-dim)', marginBottom: '12px' }}>
          {currentQ.subject} · Paper {currentQ.paper} · Q{currentQ.questionNum} · {currentQ.year}
        </div>

        {/* Question image from Cloudinary */}
        {currentQ.imageUrl ? (
          <div style={{ marginBottom: '22px' }}>
            <img
              src={currentQ.imageUrl}
              alt={`Question ${currentQ.questionNum}`}
              style={{
                maxWidth: '100%',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                display: 'block',
              }}
              loading="lazy"
            />
          </div>
        ) : (
          <div style={{ fontSize: '.84rem', color: 'var(--text-dim)', marginBottom: '22px', fontStyle: 'italic' }}>
            Question image unavailable
          </div>
        )}

        {currentQ.isMcq ? (
          <CloudMcqInput
            selected={isAnswered ? currentAnswer.userAnswer : pending.mcqSelected}
            locked={isAnswered}
            onSelect={letter => !isAnswered && setPending(p => ({ ...p, mcqSelected: letter }))}
            correctLetter={isAnswered ? parseMcqLetter(currentQ.msText) : null}
          />
        ) : (
          <TextInput
            question={currentQ}
            value={isAnswered ? currentAnswer.userAnswer : pending.textValue}
            disabled={isAnswered}
            onChange={v => setPending(p => ({ ...p, textValue: v }))}
            textareaRef={textareaRef}
          />
        )}

        {!isAnswered && (
          <ConfidenceRow
            value={pending.confidence}
            onChange={c => setPending(p => ({ ...p, confidence: c }))}
          />
        )}

        {quiz.mode === 'tutor' && !isAnswered && currentQ.msText && (
          <TutorHint msText={currentQ.msText} shown={pending.hintShown} onShow={() => setPending(p => ({ ...p, hintShown: true }))} />
        )}

        {isAnswered && quiz.mode !== 'exam' && (
          <CloudFeedbackPanel question={currentQ} answer={currentAnswer} />
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: isAnswered ? 'space-between' : 'flex-end' }}>
        {!isAnswered ? (
          <>
            <Button variant="ghost" size="sm" onClick={goNext}>Skip</Button>
            <Button
              size="sm"
              disabled={submitting || (currentQ.isMcq && pending.mcqSelected === null)}
              onClick={() => void submitAnswer()}
            >
              {submitting ? 'Grading…' : 'Submit'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => router.push(`/results?id=${quiz.sessionId}`)}>
              End Quiz
            </Button>
            <Button size="sm" onClick={goNext}>
              {quiz.currentIdx + 1 >= quiz.questions.length ? 'View Results →' : 'Next →'}
            </Button>
          </>
        )}
      </div>

      <div style={{ fontSize: '.68rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '10px' }}>
        Press <kbd style={{ background: 'var(--border)', borderRadius: '3px', padding: '1px 6px', fontFamily: 'monospace', fontSize: '.65rem' }}>A</kbd>–<kbd style={{ background: 'var(--border)', borderRadius: '3px', padding: '1px 6px', fontFamily: 'monospace', fontSize: '.65rem' }}>D</kbd> for MCQ
        {' · '}<kbd style={{ background: 'var(--border)', borderRadius: '3px', padding: '1px 6px', fontFamily: 'monospace', fontSize: '.65rem' }}>Enter</kbd> to submit / next
        {' · '}<kbd style={{ background: 'var(--border)', borderRadius: '3px', padding: '1px 6px', fontFamily: 'monospace', fontSize: '.65rem' }}>→</kbd> for next
      </div>
    </div>
  )
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: '860px', margin: '0 auto', padding: '60px 16px', textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div>}>
      <QuizInner />
    </Suspense>
  )
}

// ─── Sub-components ───────────────────────────────────────────────

// Parses the correct MCQ answer letter (A/B/C/D) from mark scheme text
function parseMcqLetter(msText: string | null): string | null {
  if (!msText) return null
  const match = msText.trim().toUpperCase().match(/\b([ABCD])\b/)
  return match ? match[1] : null
}

function CloudMcqInput({
  selected, locked, onSelect, correctLetter,
}: {
  selected: string | null
  locked: boolean
  onSelect: (letter: string) => void
  correctLetter: string | null
}) {
  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
      {(['A', 'B', 'C', 'D'] as const).map(letter => {
        let borderColor = 'var(--border)'
        let bg = 'var(--bg)'
        let color = 'var(--text)'

        if (locked) {
          if (letter === correctLetter) {
            borderColor = 'var(--green)'; bg = 'var(--green-bg)'; color = 'var(--green)'
          } else if (letter === selected) {
            borderColor = 'var(--red)'; bg = 'var(--red-bg)'; color = 'var(--red)'
          }
        } else if (letter === selected) {
          borderColor = 'var(--accent)'; bg = 'var(--accent-glow)'
        }

        return (
          <button
            key={letter}
            onClick={() => onSelect(letter)}
            disabled={locked}
            style={{
              width: '60px', height: '60px',
              border: `1px solid ${borderColor}`, background: bg,
              borderRadius: 'var(--radius)',
              cursor: locked ? 'default' : 'pointer',
              transition: 'var(--transition)',
              fontSize: '1.2rem', fontWeight: 700, color,
              fontFamily: 'inherit',
            }}
          >
            {letter}
          </button>
        )
      })}
    </div>
  )
}

function TextInput({
  question, value, disabled, onChange, textareaRef,
}: {
  question: CloudQuestion
  value: string
  disabled: boolean
  onChange: (v: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  const rows = question.msMarks != null && question.msMarks >= 6 ? 8 : 4
  return (
    <div>
      <div style={{ fontSize: '.75rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
        Your answer{question.msMarks != null ? ` (${question.msMarks} marks)` : ''}:
      </div>
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        placeholder="Type your answer here…"
        style={{
          width: '100%', padding: '14px 16px',
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', color: 'var(--text)',
          fontSize: '.92rem', fontFamily: 'inherit',
          resize: 'vertical', transition: 'var(--transition)', lineHeight: 1.6,
        }}
      />
    </div>
  )
}

const CONFIDENCE_OPTS = [
  { id: 'confident', label: '😊 Confident', activeStyle: { borderColor: 'var(--green)', color: 'var(--green)', background: 'var(--green-bg)' } },
  { id: 'unsure',    label: '🤔 Unsure',    activeStyle: { borderColor: 'var(--amber)', color: 'var(--amber)', background: 'var(--amber-bg)' } },
  { id: 'guessed',   label: '🎲 Guessed',   activeStyle: { borderColor: 'var(--red)',   color: 'var(--red)',   background: 'var(--red-bg)' } },
]

function ConfidenceRow({ value, onChange }: { value: string | null; onChange: (c: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
      {CONFIDENCE_OPTS.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          style={{
            flex: 1, padding: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-dim)',
            fontSize: '.73rem', fontWeight: 500,
            cursor: 'pointer', transition: 'var(--transition)',
            fontFamily: 'inherit', textAlign: 'center',
            ...(value === opt.id ? opt.activeStyle : {}),
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function TutorHint({ msText, shown, onShow }: { msText: string; shown: boolean; onShow: () => void }) {
  if (!shown) {
    return (
      <button
        onClick={onShow}
        style={{
          marginTop: '12px', padding: '7px 14px',
          background: 'transparent', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', color: 'var(--text-dim)',
          fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        💡 Show Hint
      </button>
    )
  }
  // Show first line of mark scheme as hint
  const hint = msText.split('\n')[0]?.trim() ?? 'Refer to the mark scheme after answering.'
  return (
    <div style={{
      background: 'var(--amber-bg)', border: '1px solid rgba(245,158,11,.3)',
      borderRadius: 'var(--radius)', padding: '14px 16px', marginTop: '12px',
    }}>
      <div style={{ fontSize: '.7rem', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '4px' }}>
        💡 Hint
      </div>
      <div style={{ fontSize: '.84rem', color: 'var(--text)', lineHeight: 1.6 }}>{hint}</div>
    </div>
  )
}

function CloudFeedbackPanel({ question, answer }: { question: CloudQuestion; answer: AnsweredQuestion }) {
  const { gradeResult } = answer
  const isCorrect = gradeResult.correct === true
  const isPartial = gradeResult.status === 'partial'
  const isUngraded = gradeResult.status === 'ungraded'

  const headerBg = isCorrect ? 'var(--green-bg)' : isPartial ? 'var(--amber-bg)' : isUngraded ? 'var(--bg-card)' : 'var(--red-bg)'
  const headerColor = isCorrect ? 'var(--green)' : isPartial ? 'var(--amber)' : isUngraded ? 'var(--text-dim)' : 'var(--red)'
  const headerText = isCorrect ? '✓ Correct' : isPartial ? `◑ Partial — ${gradeResult.score}/${gradeResult.maxScore}` : isUngraded ? `Ungraded` : '✗ Incorrect'

  const correctLetter = question.isMcq ? parseMcqLetter(question.msText) : null

  return (
    <div style={{ marginTop: '20px' }} className="fade-in">
      {/* Result header */}
      <div style={{
        padding: '14px 18px',
        borderRadius: 'var(--radius) var(--radius) 0 0',
        fontWeight: 700, fontSize: '.92rem',
        background: headerBg,
        border: `1px solid ${headerColor}40`,
        color: headerColor,
      }}>
        {headerText}
        {!isCorrect && question.isMcq && correctLetter && (
          <span style={{ fontWeight: 400, marginLeft: '8px' }}>— Answer: {correctLetter}</span>
        )}
      </div>

      <div style={{
        padding: '18px',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderTop: 'none',
        borderRadius: '0 0 var(--radius) var(--radius)',
      }}>
        {/* AI feedback (non-MCQ) */}
        {gradeResult.feedback && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '5px' }}>
              Feedback
            </div>
            <div style={{ fontSize: '.85rem', lineHeight: 1.65, color: 'var(--text)' }}>{gradeResult.feedback}</div>
          </div>
        )}

        {/* Strengths */}
        {gradeResult.strengths && gradeResult.strengths.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '4px' }}>Strengths</div>
            {gradeResult.strengths.map((s, i) => (
              <div key={i} style={{ fontSize: '.84rem', color: 'var(--text)', padding: '2px 0' }}>✓ {s}</div>
            ))}
          </div>
        )}

        {/* Missing points */}
        {gradeResult.missingPoints && gradeResult.missingPoints.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '4px' }}>To improve</div>
            {gradeResult.missingPoints.map((s, i) => (
              <div key={i} style={{ fontSize: '.84rem', color: 'var(--text)', padding: '2px 0' }}>→ {s}</div>
            ))}
          </div>
        )}

        {/* Mark scheme */}
        {question.msText && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px' }}>
              Mark Scheme {question.msMarks != null ? `(${question.msMarks} marks)` : ''}
            </div>
            <pre style={{ margin: 0, fontSize: '.82rem', color: 'var(--text)', lineHeight: 1.65, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {question.msText}
            </pre>
          </div>
        )}

        {/* Exam tip */}
        <div style={{ background: 'var(--purple-bg)', border: '1px solid rgba(168,85,247,.3)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
          <div style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '3px' }}>
            📝 Exam Tip
          </div>
          <div style={{ fontSize: '.82rem', color: 'var(--text)', lineHeight: 1.55 }}>
            {generateExamTip(question.isMcq ? 'mcq' : 'short-answer')}
          </div>
        </div>
      </div>
    </div>
  )
}

function FlashcardView({
  quiz, pending, setPending, goNext, goPrev,
}: {
  quiz: QuizState
  pending: PendingInput
  setPending: React.Dispatch<React.SetStateAction<PendingInput>>
  goNext: () => void
  goPrev: () => void
}) {
  const q = quiz.questions[quiz.currentIdx]
  if (!q) return null

  function flip() { setPending(p => ({ ...p, flashcardFlipped: !p.flashcardFlipped })) }

  const correctLetter = q.isMcq ? parseMcqLetter(q.msText) : null

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '20px 16px 100px' }}>
      <ProgressBar
        value={quiz.currentIdx + 1}
        max={quiz.questions.length}
        label={`${quiz.currentIdx + 1} / ${quiz.questions.length}`}
        sublabel="Flashcard Mode"
      />

      <div
        onClick={flip}
        style={{ perspective: '1000px', marginBottom: '20px', cursor: 'pointer', minHeight: '280px', position: 'relative' }}
      >
        <div
          style={{
            position: 'relative', minHeight: '280px',
            transformStyle: 'preserve-3d', transition: 'transform .6s ease',
            transform: pending.flashcardFlipped ? 'rotateY(180deg)' : 'none',
          }}
        >
          {/* Front: question image */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '24px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          }}>
            <div style={{ fontSize: '.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
              {q.subject} · Paper {q.paper} · Q{q.questionNum}
            </div>
            {q.imageUrl ? (
              <img src={q.imageUrl} alt={`Q${q.questionNum}`} style={{ maxWidth: '100%', borderRadius: 'var(--radius)' }} loading="lazy" />
            ) : (
              <div style={{ color: 'var(--text-dim)', fontSize: '.84rem' }}>Image unavailable</div>
            )}
            <div style={{ marginTop: '16px', fontSize: '.72rem', color: 'var(--text-dim)' }}>Click to flip</div>
          </div>
          {/* Back: mark scheme */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '24px',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
            transform: 'rotateY(180deg)', overflow: 'auto',
          }}>
            <div style={{ fontSize: '.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
              Answer {q.msMarks != null ? `(${q.msMarks} marks)` : ''}
              {correctLetter && ` — ${correctLetter}`}
            </div>
            {q.msText ? (
              <pre style={{ margin: 0, fontSize: '.85rem', color: 'var(--text-bright)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {q.msText}
              </pre>
            ) : (
              <div style={{ color: 'var(--text-dim)', fontSize: '.84rem' }}>No mark scheme available</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <Button variant="ghost" size="sm" disabled={quiz.currentIdx === 0} onClick={goPrev}>
          ← Previous
        </Button>
        <Button size="sm" onClick={goNext}>
          {quiz.currentIdx + 1 >= quiz.questions.length ? 'Finish' : 'Next →'}
        </Button>
      </div>
      <div style={{ fontSize: '.68rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '10px' }}>
        <kbd style={{ background: 'var(--border)', borderRadius: '3px', padding: '1px 6px', fontFamily: 'monospace', fontSize: '.65rem' }}>Space</kbd> to flip ·{' '}
        <kbd style={{ background: 'var(--border)', borderRadius: '3px', padding: '1px 6px', fontFamily: 'monospace', fontSize: '.65rem' }}>←</kbd>
        <kbd style={{ background: 'var(--border)', borderRadius: '3px', padding: '1px 6px', fontFamily: 'monospace', fontSize: '.65rem' }}>→</kbd> to navigate
      </div>
    </div>
  )
}

