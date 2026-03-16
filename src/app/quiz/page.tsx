'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Question, GradeResult, SessionMode } from '@/types'
import { Button, Badge, ProgressBar } from '@/components/ui'
import { generateExamTip } from '@/lib/grading'
import { getSession, submitAnswer as storeSubmitAnswer } from '@/lib/sessionStore'

// ─── Types ────────────────────────────────────────────────────────

interface QuizState {
  sessionId: string
  mode: SessionMode
  questions: Question[]
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
  mcqSelected: number | null
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
    const userAnswer =
      currentQ.questionType === 'mcq'
        ? String(pending.mcqSelected ?? '')
        : pending.textValue

    if (currentQ.questionType === 'mcq' && pending.mcqSelected === null) return

    setSubmitting(true)
    try {
      const result = storeSubmitAnswer({
        sessionId: quiz.sessionId,
        questionId: currentQ.id,
        userAnswer,
        confidence: pending.confidence ?? undefined,
        timeMs: Date.now() - pending.startTime,
      })
      if ('error' in result) return
      setQuiz(q => q ? {
        ...q,
        answers: {
          ...q.answers,
          [q.currentIdx]: {
            userAnswer,
            gradeResult: result.gradeResult,
            confidence: pending.confidence ?? undefined,
            timeMs: Date.now() - pending.startTime,
          },
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
      if (currentQ.questionType === 'mcq' && !isAnswered && ['1','2','3','4'].includes(e.key)) {
        setPending(p => ({ ...p, mcqSelected: parseInt(e.key) - 1 }))
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          <Badge label={currentQ.difficulty} kind={currentQ.difficulty} />
          <Badge label={currentQ.questionType} kind="type" />
          <Badge label={currentQ.topic} kind="topic" />
          {currentQ.marks > 1 && <Badge label={`${currentQ.marks} marks`} kind="marks" />}
        </div>

        <div style={{ fontSize: '.72rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
          {currentQ.paper} · {currentQ.syllabusRef ?? ''}
        </div>

        <div
          style={{
            fontFamily: "'Palatino Linotype', Georgia, serif",
            fontSize: '1.12rem',
            color: 'var(--text-bright)',
            lineHeight: 1.65,
            marginBottom: '22px',
            fontWeight: 500,
          }}
        >
          {currentQ.prompt}
        </div>

        {currentQ.questionType === 'mcq' ? (
          <McqInput
            question={currentQ}
            selected={isAnswered ? parseInt(currentAnswer.userAnswer) : pending.mcqSelected}
            locked={isAnswered}
            onSelect={i => !isAnswered && setPending(p => ({ ...p, mcqSelected: i }))}
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

        {quiz.mode === 'tutor' && !isAnswered && (
          <TutorHint question={currentQ} shown={pending.hintShown} onShow={() => setPending(p => ({ ...p, hintShown: true }))} />
        )}

        {isAnswered && quiz.mode !== 'exam' && (
          <FeedbackPanel question={currentQ} answer={currentAnswer} />
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: isAnswered ? 'space-between' : 'flex-end' }}>
        {!isAnswered ? (
          <>
            <Button variant="ghost" size="sm" onClick={goNext}>Skip</Button>
            <Button
              size="sm"
              disabled={submitting || (currentQ.questionType === 'mcq' && pending.mcqSelected === null)}
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
        Press <kbd style={{ background: 'var(--border)', borderRadius: '3px', padding: '1px 6px', fontFamily: 'monospace', fontSize: '.65rem' }}>1</kbd>–<kbd style={{ background: 'var(--border)', borderRadius: '3px', padding: '1px 6px', fontFamily: 'monospace', fontSize: '.65rem' }}>4</kbd> for MCQ
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

// ─── Sub-components (unchanged) ───────────────────────────────────

function McqInput({
  question, selected, locked, onSelect,
}: {
  question: Question
  selected: number | null
  locked: boolean
  onSelect: (i: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {question.options!.map((opt, i) => {
        let borderColor = 'var(--border)'
        let bg = 'var(--bg)'
        let color = 'var(--text)'
        let letterBg = 'var(--border)'
        let letterColor = 'var(--text-dim)'

        if (locked) {
          if (i === question.correctAnswer) {
            borderColor = 'var(--green)'; bg = 'var(--green-bg)'; color = 'var(--green)'
            letterBg = 'var(--green)'; letterColor = '#fff'
          } else if (i === selected) {
            borderColor = 'var(--red)'; bg = 'var(--red-bg)'; color = 'var(--red)'
            letterBg = 'var(--red)'; letterColor = '#fff'
          }
        } else if (i === selected) {
          borderColor = 'var(--accent)'; bg = 'var(--accent-glow)'
        }

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            disabled={locked}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 16px',
              background: bg, border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius)',
              cursor: locked ? 'default' : 'pointer',
              transition: 'var(--transition)',
              fontSize: '.92rem', color, width: '100%',
              textAlign: 'left', fontFamily: 'inherit',
            }}
          >
            <span
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '30px', height: '30px', borderRadius: '50%',
                background: letterBg, fontSize: '.78rem', fontWeight: 700,
                flexShrink: 0, color: letterColor,
              }}
            >
              {['A','B','C','D'][i]}
            </span>
            <span>{opt}</span>
          </button>
        )
      })}
    </div>
  )
}

function TextInput({
  question, value, disabled, onChange, textareaRef,
}: {
  question: Question
  value: string
  disabled: boolean
  onChange: (v: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  const rows = question.questionType === 'essay' ? 10 : question.questionType === 'short-answer' ? 4 : 2
  return (
    <div>
      <div style={{ fontSize: '.75rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
        Your answer{question.questionType === 'calculation' ? ' (show working)' : ''}:
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

function TutorHint({ question, shown, onShow }: { question: Question; shown: boolean; onShow: () => void }) {
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
  const step = question.teachingSteps?.[0] ?? question.commonMistakes?.[0] ?? 'Think about the key formula or definition.'
  return (
    <div style={{
      background: 'var(--amber-bg)', border: '1px solid rgba(245,158,11,.3)',
      borderRadius: 'var(--radius)', padding: '14px 16px', marginTop: '12px',
    }}>
      <div style={{ fontSize: '.7rem', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '4px' }}>
        💡 Hint
      </div>
      <div style={{ fontSize: '.84rem', color: 'var(--text)', lineHeight: 1.6 }}>{step}</div>
    </div>
  )
}

function FeedbackPanel({ question, answer }: { question: Question; answer: AnsweredQuestion }) {
  const { gradeResult } = answer
  const isCorrect = gradeResult.correct === true
  const isPartial = gradeResult.status === 'partial'
  const isEssay = question.questionType === 'essay' || question.questionType === 'short-answer'

  const headerBg = isCorrect ? 'var(--green-bg)' : isPartial ? 'var(--amber-bg)' : 'var(--red-bg)'
  const headerColor = isCorrect ? 'var(--green)' : isPartial ? 'var(--amber)' : 'var(--red)'
  const headerText = isCorrect ? '✓ Correct' : isPartial ? `◑ Partial — ${gradeResult.score}/${gradeResult.maxScore}` : '✗ Incorrect'

  return (
    <div style={{ marginTop: '20px' }} className="fade-in">
      {!isEssay && (
        <div style={{
          padding: '14px 18px',
          borderRadius: 'var(--radius) var(--radius) 0 0',
          fontWeight: 700, fontSize: '.92rem',
          background: headerBg,
          border: `1px solid ${headerColor}40`,
          color: headerColor,
        }}>
          {headerText}
          {!isCorrect && question.questionType === 'mcq' && question.options && (
            <span style={{ fontWeight: 400, marginLeft: '8px' }}>
              — Answer: {question.options[question.correctAnswer as number]}
            </span>
          )}
        </div>
      )}

      <div style={{
        padding: '18px',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderTop: isEssay ? '1px solid var(--border)' : 'none',
        borderRadius: isEssay ? 'var(--radius)' : '0 0 var(--radius) var(--radius)',
      }}>
        <FeedbackSection title="Explanation" text={question.explanation} />

        {question.teachingSteps && question.teachingSteps.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '5px' }}>
              Step by Step
            </div>
            {question.teachingSteps.map((s, i) => (
              <div key={i} style={{ fontSize: '.82rem', color: 'var(--text)', padding: '6px 0 6px 16px', borderLeft: '2px solid var(--border)', marginBottom: '4px' }}>{s}</div>
            ))}
          </div>
        )}

        {question.markScheme && question.markScheme.length > 0 && (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px' }}>
              Mark Scheme
            </div>
            {question.markScheme.map((p, i) => (
              <div key={i} style={{ fontSize: '.82rem', color: 'var(--text)', padding: '4px 0 4px 18px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: 'var(--green)', fontWeight: 700 }}>✓</span>
                {p}
              </div>
            ))}
          </div>
        )}

        {isEssay && gradeResult.criterionScores && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Estimated Score</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-bright)' }}>
                {gradeResult.score} / {gradeResult.maxScore}
              </span>
              <span style={{ fontSize: '.72rem', color: 'var(--text-dim)' }}>({gradeResult.gradingType === 'ai_rubric' ? 'AI graded' : 'auto-graded'})</span>
            </div>
            {gradeResult.strengths && gradeResult.strengths.length > 0 && (
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '4px' }}>Strengths</div>
                {gradeResult.strengths.map((s, i) => <div key={i} style={{ fontSize: '.84rem', color: 'var(--text)' }}>✓ {s}</div>)}
              </div>
            )}
            {gradeResult.missingPoints && gradeResult.missingPoints.length > 0 && (
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '4px' }}>Improvements</div>
                {gradeResult.missingPoints.map((s, i) => <div key={i} style={{ fontSize: '.84rem', color: 'var(--text)' }}>→ {s}</div>)}
              </div>
            )}
          </div>
        )}

        {!isCorrect && question.commonMistakes && question.commonMistakes.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '5px' }}>
              Common Mistakes
            </div>
            {question.commonMistakes.map((m, i) => (
              <div key={i} style={{ fontSize: '.8rem', color: 'var(--text-dim)', padding: '4px 0' }}>⚠ {m}</div>
            ))}
          </div>
        )}

        <div style={{ background: 'var(--purple-bg)', border: '1px solid rgba(168,85,247,.3)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
          <div style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '3px' }}>
            📝 Exam Tip
          </div>
          <div style={{ fontSize: '.82rem', color: 'var(--text)', lineHeight: 1.55 }}>
            {generateExamTip(question.questionType)}
          </div>
        </div>
      </div>
    </div>
  )
}

function FeedbackSection({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '5px' }}>
        {title}
      </div>
      <div style={{ fontSize: '.85rem', lineHeight: 1.65, color: 'var(--text)' }}>{text}</div>
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
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '32px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center',
          }}>
            <div style={{ fontSize: '.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
              Question · {q.topic}
            </div>
            <div style={{ fontFamily: "'Palatino Linotype', Georgia, serif", fontSize: '1.1rem', color: 'var(--text-bright)', lineHeight: 1.7 }}>{q.prompt}</div>
            <div style={{ marginTop: '16px', fontSize: '.72rem', color: 'var(--text-dim)' }}>Click to flip</div>
          </div>
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '32px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center',
            transform: 'rotateY(180deg)',
          }}>
            <div style={{ fontSize: '.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Answer</div>
            <div style={{ fontFamily: "'Palatino Linotype', Georgia, serif", fontSize: '1.1rem', color: 'var(--text-bright)', lineHeight: 1.7 }}>
              {q.questionType === 'mcq' ? q.options![q.correctAnswer as number] : (q.correctAnswer ?? q.explanation)}
            </div>
            <div style={{ marginTop: '12px', fontSize: '.8rem', color: 'var(--text-dim)', textAlign: 'left', width: '100%' }}>{q.explanation}</div>
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

