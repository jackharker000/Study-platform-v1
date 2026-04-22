'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CloudQuestion, GradeResult, SessionMode, SessionFilters } from '@/types'
import { Button, Badge, ProgressBar } from '@/components/ui'
import { generateExamTip } from '@/lib/grading'
import { getSession, recordAnswer } from '@/lib/sessionStore'

// ─── Types ────────────────────────────────────────────────────────

interface QuizState {
  sessionId: string
  subjectId: string
  mode: SessionMode
  filters: SessionFilters
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
  partAnswers: Record<string, string>  // part label → answer (multipart questions)
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
    mcqSelected: null, textValue: '', partAnswers: {}, confidence: null,
    hintShown: false, flashcardFlipped: false, startTime: Date.now(),
  })
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const answerCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const goNextRef = useRef<() => void>(() => {})
  const fetchingMore = useRef(false)

  // Load session on mount
  useEffect(() => {
    if (!sessionId) { router.push('/'); return }
    const session = getSession(sessionId)
    if (!session) { router.push('/'); return }
    setQuiz({
      sessionId,
      subjectId: session.subject ?? '',
      mode: session.mode as SessionMode,
      filters: session.filters,
      questions: session.questions,
      currentIdx: 0,
      answers: {},
      status: 'active',
    })
    if (session.mode === 'timed' && session.filters.timedDurationMs) {
      setTimeLeft(session.filters.timedDurationMs)
    }
    setPending(p => ({ ...p, startTime: Date.now() }))
  }, [sessionId, router])

  // Preload next 5 PDFs truly sequentially (one at a time) so the local PDF server
  // isn't overwhelmed. await each fetch before starting the next — browser caches
  // the response so the <object> renders instantly when the user reaches that question.
  useEffect(() => {
    if (!quiz) return
    let cancelled = false
    const preload = async () => {
      for (let i = 1; i <= 5; i++) {
        if (cancelled) break
        const q = quiz.questions[quiz.currentIdx + i]
        if (q?.imageUrl) {
          try {
            await fetch(`/api/pdf-proxy?url=${encodeURIComponent(q.imageUrl)}`)
          } catch {
            // PDF server unreachable for this question — continue to next
          }
        }
      }
    }
    void preload()
    return () => { cancelled = true }
  }, [quiz?.currentIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timed mode: countdown (500 ms tick)
  useEffect(() => {
    if (quiz?.mode !== 'timed' || timeLeft === null || timeLeft <= 0) return
    const t = setTimeout(() => setTimeLeft(n => Math.max(0, (n ?? 0) - 500)), 500)
    return () => clearTimeout(t)
  }, [timeLeft, quiz?.mode])

  // Timed mode: navigate to results when time runs out
  useEffect(() => {
    if (quiz?.mode === 'timed' && timeLeft === 0) {
      router.push(`/results?id=${quiz.sessionId}`)
    }
  }, [timeLeft, quiz?.mode, quiz?.sessionId, router])

  // Timed mode: rolling loader — fetch 50 more questions when near the end
  useEffect(() => {
    if (!quiz || quiz.mode !== 'timed') return
    if (quiz.currentIdx < quiz.questions.length - 10) return
    if (fetchingMore.current) return
    fetchingMore.current = true
    const qs = new URLSearchParams({ subjectId: quiz.subjectId, shuffle: 'true', limit: '50' })
    const f = quiz.filters
    if (f.paper && f.paper !== 'all') qs.set('paper', f.paper)
    if (f.topic && f.topic !== 'all') qs.set('topic', f.topic)
    if (f.year && f.year !== 'all') qs.set('year', f.year)
    if (f.questionType && f.questionType !== 'all') qs.set('isMcq', f.questionType === 'mcq' ? '1' : '0')
    fetch(`/api/questions?${qs}`)
      .then(r => r.json())
      .then((newQs: CloudQuestion[]) => {
        if (Array.isArray(newQs) && newQs.length) {
          setQuiz(q => q ? { ...q, questions: [...q.questions, ...newQs] } : q)
        }
      })
      .catch(() => {})
      .finally(() => { fetchingMore.current = false })
  }, [quiz?.currentIdx, quiz?.mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentQ = quiz?.questions[quiz.currentIdx]
  const currentAnswer = quiz?.answers[quiz?.currentIdx ?? -1]
  const isAnswered = !!currentAnswer

  // Submit answer
  const submitAnswer = useCallback(async () => {
    if (!quiz || !currentQ || isAnswered || submitting) return

    const isMcq = currentQ.isMcq
    if (isMcq && !pending.mcqSelected) return

    // Parse parts for multipart detection
    const parsedParts = currentQ.partsJson ? (() => {
      try { return JSON.parse(currentQ.partsJson) as { label: string; text: string; marks: number }[] }
      catch { return null }
    })() : null
    const isMultipart = !isMcq && parsedParts && parsedParts.length >= 2

    const userAnswer = isMcq
      ? (pending.mcqSelected ?? '')
      : isMultipart
      ? JSON.stringify(pending.partAnswers)
      : pending.textValue

    setSubmitting(true)
    try {
      let gradeResult: GradeResult

      if (isMcq) {
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
      } else if (isMultipart) {
        // Multipart: send each part to the grade API for independent marking
        const res = await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: currentQ.id,
            userAnswer,
            isMcq: false,
            msText: currentQ.msText,
            msMarks: currentQ.msMarks,
            parts: parsedParts!.map(p => ({
              label: p.label,
              msText: `${p.label} ${p.text}`,
              marks: p.marks,
              userAnswer: pending.partAnswers[p.label] ?? '',
            })),
          }),
        })
        gradeResult = await res.json() as GradeResult
      } else {
        // Single structured question: AI grading with optional canvas
        const canvasBase64 = (() => {
          const cv = answerCanvasRef.current
          if (!cv) return null
          const ctx = cv.getContext('2d')
          if (!ctx) return null
          const d = ctx.getImageData(0, 0, cv.width, cv.height).data
          const hasDrawing = Array.from(d).some((v, i) => i % 4 === 3 && v > 0)
          return hasDrawing ? cv.toDataURL('image/png') : null
        })()
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
            ...(canvasBase64 ? { canvasBase64 } : {}),
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

      // Timed mode: auto-advance MCQ after 200ms
      if (quiz.mode === 'timed' && isMcq) {
        setTimeout(() => goNextRef.current(), 200)
      }
    } finally {
      setSubmitting(false)
    }
  }, [quiz, currentQ, isAnswered, submitting, pending])

  // Next question
  function goNext() {
    if (!quiz) return
    if (quiz.mode !== 'timed' && quiz.currentIdx + 1 >= quiz.questions.length) {
      router.push(`/results?id=${quiz.sessionId}`)
      return
    }
    setQuiz(q => q ? { ...q, currentIdx: q.currentIdx + 1 } : q)
    setPending({ mcqSelected: null, textValue: '', partAnswers: {}, confidence: null, hintShown: false, flashcardFlipped: false, startTime: Date.now() })
  }
  goNextRef.current = goNext

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

  // Parse multipart info for current question
  const currentParts = currentQ.partsJson ? (() => {
    try { return JSON.parse(currentQ.partsJson) as { label: string; text: string; marks: number }[] }
    catch { return null }
  })() : null
  const isMultipart = !currentQ.isMcq && currentParts && currentParts.length >= 2

  // Parse answered part answers (stored as JSON)
  const answeredPartAnswers: Record<string, string> = (() => {
    if (!isAnswered || !isMultipart) return {}
    try { return JSON.parse(currentAnswer.userAnswer) as Record<string, string> }
    catch { return {} }
  })()

  const answeredCount = Object.keys(quiz.answers).length
  const correctCount = Object.values(quiz.answers).filter(a => a.gradeResult.correct === true).length
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0
  const marksScored = Object.values(quiz.answers).reduce((s, a) => s + (a.gradeResult.score ?? 0), 0)

  const timedDurationMs = quiz.filters.timedDurationMs ?? 600_000

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '20px 16px 100px' }}>
      {/* Timed mode: fixed timer overlay */}
      {quiz.mode === 'timed' && timeLeft !== null && (
        <div style={{
          position: 'fixed', top: '12px', right: '12px', zIndex: 100,
          background: 'var(--bg-card)', border: `1px solid ${timeLeft < 60_000 ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', padding: '8px 14px',
          boxShadow: '0 2px 12px rgba(0,0,0,.15)', textAlign: 'center', minWidth: '72px',
          transition: 'border-color .3s',
        }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: timeLeft < 60_000 ? 'var(--red)' : 'var(--text-bright)' }}>
            {formatTime(timeLeft)}
          </div>
          <div style={{ fontSize: '.7rem', color: 'var(--text-dim)' }}>
            {marksScored} mark{marksScored !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      <ProgressBar
        value={quiz.mode === 'timed' ? (timedDurationMs - (timeLeft ?? timedDurationMs)) : quiz.currentIdx + (isAnswered ? 1 : 0)}
        max={quiz.mode === 'timed' ? timedDurationMs : quiz.questions.length}
        label={quiz.mode === 'timed' ? `${answeredCount} answered` : `${quiz.currentIdx + 1} / ${quiz.questions.length}`}
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

        {/* Question PDF with annotation canvas */}
        {currentQ.imageUrl ? (
          <AnnotatedQuestion
            url={currentQ.imageUrl}
            questionNum={currentQ.questionNum}
            questionId={currentQ.id}
            onSkip={goNext}
          />
        ) : (
          <div style={{ fontSize: '.84rem', color: 'var(--text-dim)', marginBottom: '22px', fontStyle: 'italic' }}>
            Question unavailable
          </div>
        )}

        {currentQ.isMcq ? (
          <CloudMcqInput
            selected={isAnswered ? currentAnswer.userAnswer : pending.mcqSelected}
            locked={isAnswered}
            onSelect={letter => !isAnswered && setPending(p => ({ ...p, mcqSelected: letter }))}
            correctLetter={isAnswered ? parseMcqLetter(currentQ.msText) : null}
          />
        ) : isMultipart ? (
          <MultiPartInput
            parts={currentParts!}
            values={isAnswered ? answeredPartAnswers : pending.partAnswers}
            disabled={isAnswered}
            onChange={(label, val) => setPending(p => ({ ...p, partAnswers: { ...p.partAnswers, [label]: val } }))}
          />
        ) : (
          <TextInput
            question={currentQ}
            value={isAnswered ? currentAnswer.userAnswer : pending.textValue}
            disabled={isAnswered}
            onChange={v => setPending(p => ({ ...p, textValue: v }))}
            textareaRef={textareaRef}
            answerCanvasRef={answerCanvasRef}
          />
        )}

        {!isAnswered && quiz.mode !== 'timed' && (
          <ConfidenceRow
            value={pending.confidence}
            onChange={c => setPending(p => ({ ...p, confidence: c }))}
          />
        )}

        {quiz.mode === 'tutor' && !isAnswered && currentQ.msText && (
          <TutorHint msText={currentQ.msText} shown={pending.hintShown} onShow={() => setPending(p => ({ ...p, hintShown: true }))} />
        )}

        {isAnswered && quiz.mode !== 'exam' && (
          <CloudFeedbackPanel question={currentQ} answer={currentAnswer} parts={currentParts} />
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: isAnswered ? 'space-between' : 'flex-end' }}>
        {!isAnswered ? (
          <>
            <Button variant="ghost" size="sm" onClick={goNext}>Skip</Button>
            <Button
              size="sm"
              disabled={
                submitting ||
                (currentQ.isMcq && !pending.mcqSelected) ||
                (!!isMultipart && Object.values(pending.partAnswers).every(v => !v?.trim()))
              }
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
              {quiz.mode !== 'timed' && quiz.currentIdx + 1 >= quiz.questions.length ? 'View Results →' : 'Next →'}
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

// ─── Helpers ──────────────────────────────────────────────────────

function formatTime(ms: number): string {
  const s = Math.ceil(ms / 1000)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${String(ss).padStart(2, '0')}`
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
  question, value, disabled, onChange, textareaRef, answerCanvasRef,
}: {
  question: CloudQuestion
  value: string
  disabled: boolean
  onChange: (v: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  answerCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>
}) {
  const [drawMode, setDrawMode] = useState(false)
  const localCanvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const activePointers = useRef(new Set<number>())
  const [canvasTool, setCanvasTool] = useState<'pen' | 'pencil' | 'eraser'>('pen')

  // Wire local ref to parent ref
  useEffect(() => {
    answerCanvasRef.current = localCanvasRef.current
  })

  // Clear canvas when question changes (disabled = new question answered)
  useEffect(() => {
    if (!disabled) {
      const cv = localCanvasRef.current
      if (cv) cv.getContext('2d')?.clearRect(0, 0, cv.width, cv.height)
    }
  }, [question.id, disabled])

  function getXY(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = localCanvasRef.current!.getBoundingClientRect()
    const scaleX = localCanvasRef.current!.width / rect.width
    const scaleY = localCanvasRef.current!.height / rect.height
    return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY]
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    activePointers.current.add(e.pointerId)
    if (activePointers.current.size > 1 || disabled) { drawing.current = false; return }
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const ctx = localCanvasRef.current?.getContext('2d')
    if (ctx) { ctx.beginPath(); ctx.moveTo(...getXY(e)) }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || activePointers.current.size > 1) return
    const ctx = localCanvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getXY(e)
    const pressure = e.pressure > 0 ? e.pressure : 0.5
    ctx.globalCompositeOperation = canvasTool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.lineWidth = canvasTool === 'eraser' ? 28 : canvasTool === 'pen' ? Math.max(1.5, pressure * 5) : Math.max(0.8, pressure * 2.5)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.strokeStyle = canvasTool === 'pen' ? 'rgba(0,0,0,0.9)' : canvasTool === 'pencil' ? 'rgba(30,30,30,0.55)' : 'rgba(0,0,0,0)'
    ctx.lineTo(...pos); ctx.stroke(); ctx.beginPath(); ctx.moveTo(...pos)
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    activePointers.current.delete(e.pointerId)
    drawing.current = false
    localCanvasRef.current?.getContext('2d')?.beginPath()
  }

  const rows = question.msMarks != null && question.msMarks >= 6 ? 8 : 4
  const canvasH = rows * 24 + 28

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div style={{ fontSize: '.75rem', color: 'var(--text-dim)' }}>
          Your answer{question.msMarks != null ? ` (${question.msMarks} marks)` : ''}:
        </div>
        {!disabled && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['type', 'draw'] as const).map(m => (
              <button
                key={m}
                onClick={() => setDrawMode(m === 'draw')}
                style={{
                  padding: '2px 8px', fontSize: '.72rem',
                  background: (drawMode ? m === 'draw' : m === 'type') ? 'var(--accent-glow)' : 'transparent',
                  border: `1px solid ${(drawMode ? m === 'draw' : m === 'type') ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  color: (drawMode ? m === 'draw' : m === 'type') ? 'var(--accent)' : 'var(--text-dim)',
                }}>
                {m === 'type' ? '⌨ Type' : '✏ Draw'}
              </button>
            ))}
            {drawMode && (
              <>
                {(['pen', 'pencil', 'eraser'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setCanvasTool(t)}
                    title={t}
                    style={{
                      width: '24px', height: '24px', fontSize: '.7rem',
                      background: canvasTool === t ? 'var(--accent-glow)' : 'transparent',
                      border: `1px solid ${canvasTool === t ? 'var(--accent)' : 'transparent'}`,
                      borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      color: canvasTool === t ? 'var(--accent)' : 'var(--text-dim)',
                    }}>
                    {t === 'pen' ? '✏' : t === 'pencil' ? '🖋' : '⌫'}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {drawMode && !disabled ? (
        <canvas
          ref={localCanvasRef}
          width={900}
          height={canvasH}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{
            width: '100%', height: `${canvasH}px`,
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            touchAction: 'none', cursor: 'crosshair', display: 'block',
            background: `repeating-linear-gradient(var(--bg) 0px, var(--bg) 23px, var(--border) 24px)`,
          }}
        />
      ) : (
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
      )}
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

function MultiPartInput({
  parts, values, disabled, onChange,
}: {
  parts: { label: string; text: string; marks: number }[]
  values: Record<string, string>
  disabled: boolean
  onChange: (label: string, val: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '6px' }}>
      {parts.map(part => (
        <div key={part.label}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '5px' }}>
            <span style={{ fontWeight: 700, fontSize: '.85rem', color: 'var(--accent)', minWidth: '44px', flexShrink: 0 }}>{part.label}</span>
            <span style={{ fontSize: '.82rem', color: 'var(--text)', flex: 1 }}>{part.text}</span>
            <span style={{ fontSize: '.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>[{part.marks}]</span>
          </div>
          <textarea
            rows={part.marks >= 3 ? 4 : 2}
            value={values[part.label] ?? ''}
            disabled={disabled}
            onChange={e => onChange(part.label, e.target.value)}
            placeholder={`Answer for ${part.label}…`}
            style={{
              width: '100%', padding: '10px 12px',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--text)',
              fontSize: '.88rem', fontFamily: 'inherit',
              resize: 'vertical', lineHeight: 1.5, transition: 'var(--transition)',
            }}
          />
        </div>
      ))}
    </div>
  )
}

function CloudFeedbackPanel({
  question, answer, parts,
}: {
  question: CloudQuestion
  answer: AnsweredQuestion
  parts: { label: string; text: string; marks: number }[] | null | undefined
}) {
  const { gradeResult } = answer
  const [aiTip, setAiTip] = useState<string | null>(null)
  const [tipLoading, setTipLoading] = useState(true)

  useEffect(() => {
    setAiTip(null)
    setTipLoading(true)
    fetch('/api/exam-tip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msText: question.msText,
        userAnswer: answer.userAnswer,
        isMcq: question.isMcq,
        msMarks: question.msMarks,
        score: gradeResult.score,
        maxScore: gradeResult.maxScore,
      }),
    })
      .then(r => r.json())
      .then((d: { tip?: string }) => setAiTip(d.tip ?? null))
      .catch(() => setAiTip(null))
      .finally(() => setTipLoading(false))
  }, [question.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
        {/* Per-part breakdown (multipart questions) */}
        {parts && parts.length >= 2 && gradeResult.criterionScores ? (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px' }}>
              Per-part Results
            </div>
            {parts.map((p, i) => {
              const partScore = gradeResult.criterionScores?.[p.label] ?? 0
              const partFeedback = gradeResult.partFeedbacks?.[p.label]
              const partColor = partScore === p.marks ? 'var(--green)' : partScore > 0 ? 'var(--amber)' : 'var(--red)'
              const partBg = partScore === p.marks ? 'var(--green-bg)' : partScore > 0 ? 'var(--amber-bg)' : 'var(--red-bg)'
              // Parse user's answer for this part
              let userPartAnswer = ''
              try { userPartAnswer = (JSON.parse(answer.userAnswer) as Record<string, string>)[p.label] ?? '' }
              catch { /* noop */ }
              return (
                <div key={p.label} style={{
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  marginBottom: i < parts.length - 1 ? '8px' : 0, overflow: 'hidden',
                }}>
                  {/* Part header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                    background: partBg, borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '.83rem', color: partColor, minWidth: '44px' }}>{p.label}</span>
                    <span style={{ flex: 1, fontSize: '.8rem', color: 'var(--text)' }}>{p.text}</span>
                    <span style={{ fontSize: '.8rem', fontWeight: 700, color: partColor, whiteSpace: 'nowrap' }}>
                      {partScore}/{p.marks}
                    </span>
                  </div>
                  {/* User answer */}
                  {userPartAnswer && (
                    <div style={{ padding: '6px 12px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontSize: '.8rem', color: 'var(--text-dim)' }}>
                      <em>Your answer:</em> {userPartAnswer}
                    </div>
                  )}
                  {/* Mark scheme for this part */}
                  <div style={{ padding: '6px 12px', background: 'var(--bg-card)', borderBottom: partFeedback ? '1px solid var(--border)' : 'none', fontSize: '.8rem', color: 'var(--text-dim)' }}>
                    <em>Mark scheme:</em> {p.text} [{p.marks}]
                  </div>
                  {/* AI feedback for this part */}
                  {partFeedback && (
                    <div style={{ padding: '6px 12px', background: 'var(--bg)', fontSize: '.8rem', color: 'var(--text)', lineHeight: 1.55 }}>
                      {partFeedback}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <>
            {/* AI feedback (single question) */}
            {gradeResult.feedback && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '5px' }}>
                  Feedback
                </div>
                <div style={{ fontSize: '.85rem', lineHeight: 1.65, color: 'var(--text)' }}>{gradeResult.feedback}</div>
              </div>
            )}
            {gradeResult.strengths && gradeResult.strengths.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '4px' }}>Strengths</div>
                {gradeResult.strengths.map((s, idx) => (
                  <div key={idx} style={{ fontSize: '.84rem', color: 'var(--text)', padding: '2px 0' }}>✓ {s}</div>
                ))}
              </div>
            )}
            {gradeResult.missingPoints && gradeResult.missingPoints.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '4px' }}>To improve</div>
                {gradeResult.missingPoints.map((s, idx) => (
                  <div key={idx} style={{ fontSize: '.84rem', color: 'var(--text)', padding: '2px 0' }}>→ {s}</div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Mark scheme */}
        {question.msText && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px' }}>
              Mark Scheme {question.msMarks != null ? `(${question.msMarks} marks)` : ''}
            </div>
            {parts && parts.length >= 2 ? (
              <div>
                {parts.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: '8px', padding: '5px 0',
                    borderBottom: i < parts.length - 1 ? '1px solid var(--border)' : 'none',
                    alignItems: 'flex-start',
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '.82rem', minWidth: '56px', color: 'var(--accent)', flexShrink: 0 }}>{p.label}</span>
                    <span style={{ flex: 1, fontSize: '.82rem', color: 'var(--text)', lineHeight: 1.55 }}>{p.text}</span>
                    <span style={{ fontSize: '.78rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>[{p.marks}]</span>
                  </div>
                ))}
              </div>
            ) : (
              <pre style={{ margin: 0, fontSize: '.82rem', color: 'var(--text)', lineHeight: 1.65, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {question.msText}
              </pre>
            )}
          </div>
        )}

        {/* Exam tip */}
        <div style={{ background: 'var(--purple-bg)', border: '1px solid rgba(168,85,247,.3)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
          <div style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '3px' }}>
            📝 Exam Tip
          </div>
          <div style={{ fontSize: '.82rem', color: tipLoading ? 'var(--text-dim)' : 'var(--text)', lineHeight: 1.55, fontStyle: tipLoading ? 'italic' : 'normal' }}>
            {tipLoading ? 'Generating personalised tip…' : (aiTip ?? generateExamTip(question.isMcq ? 'mcq' : 'short-answer'))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PDF Viewer ────────────────────────────────────────────────────

function proxyUrl(raw: string): string {
  return `/api/pdf-proxy?url=${encodeURIComponent(raw)}`
}

function QuestionPdf({ url, questionNum }: { url: string; questionNum: string }) {
  const src = proxyUrl(url)
  return (
    <div style={{ marginBottom: '22px' }}>
      <object
        data={src}
        type="application/pdf"
        className="question-pdf"
        style={{
          width: '100%',
          minHeight: '420px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          display: 'block',
          background: '#fff',
        }}
      >
        <div style={{ padding: '20px', textAlign: 'center', fontSize: '.84rem', color: 'var(--text-dim)' }}>
          <a href={src} target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
            Open question {questionNum} in new tab ↗
          </a>
        </div>
      </object>
    </div>
  )
}

// ─── Annotation Canvas Overlay ─────────────────────────────────────

type AnnotationTool = 'off' | 'pen' | 'pencil' | 'eraser' | 'lasso'

function AnnotatedQuestion({ url, questionNum, questionId, onSkip }: {
  url: string; questionNum: string; questionId: string; onSkip?: () => void
}) {
  const src = proxyUrl(url)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const objectRef = useRef<HTMLObjectElement>(null)
  const drawing = useRef(false)
  const activePointers = useRef(new Set<number>())
  const lassoPath = useRef<[number, number][]>([])

  const [tool, setTool] = useState<AnnotationTool>('off')
  const [pencilOnly, setPencilOnly] = useState(false)
  const [canvasH, setCanvasH] = useState(420)
  const [pdfStatus, setPdfStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  const failCount = useRef(0)

  // Reset on question change
  useEffect(() => {
    const cv = canvasRef.current
    if (cv) cv.getContext('2d')?.clearRect(0, 0, cv.width, cv.height)
    drawing.current = false
    activePointers.current.clear()
    lassoPath.current = []
    setPdfStatus('loading')
    setRetry(0)
    failCount.current = 0
  }, [questionId])

  // 12 s load timeout — reset when retry changes
  useEffect(() => {
    if (pdfStatus !== 'loading') return
    const t = setTimeout(() => {
      failCount.current += 1
      if (failCount.current >= 2 && onSkip) {
        onSkip()
      } else {
        setPdfStatus('error')
      }
    }, 12_000)
    return () => clearTimeout(t)
  }, [pdfStatus, retry, onSkip])

  // Match canvas height to rendered PDF size
  useEffect(() => {
    const ob = objectRef.current
    if (!ob) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const h = e.contentRect.height
        setCanvasH(h > 60 ? h : 420)
      }
    })
    ro.observe(ob)
    return () => ro.disconnect()
  }, [])

  function getXY(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = canvasRef.current!.getBoundingClientRect()
    const scaleX = canvasRef.current!.width / rect.width
    const scaleY = canvasRef.current!.height / rect.height
    return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY]
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === 'off') return
    activePointers.current.add(e.pointerId)
    if (activePointers.current.size > 1) { drawing.current = false; return }
    if (pencilOnly && e.pointerType !== 'pen') return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const pos = getXY(e)
    if (tool === 'lasso') {
      lassoPath.current = [pos]
    } else {
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) { ctx.beginPath(); ctx.moveTo(...pos) }
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || tool === 'off') return
    if (activePointers.current.size > 1) return
    if (pencilOnly && e.pointerType !== 'pen') return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getXY(e)
    const pressure = e.pressure > 0 ? e.pressure : 0.5

    if (tool === 'lasso') {
      lassoPath.current.push(pos)
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
      // re-draw existing content would require a snapshot — lasso shows outline only
      ctx.save()
      ctx.setLineDash([5, 4])
      ctx.strokeStyle = 'rgba(100,100,100,0.8)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      const [fx, fy] = lassoPath.current[0]
      ctx.moveTo(fx, fy)
      lassoPath.current.slice(1).forEach(([lx, ly]) => ctx.lineTo(lx, ly))
      ctx.stroke()
      ctx.restore()
      return
    }

    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    if (tool === 'eraser') {
      ctx.lineWidth = 28
    } else if (tool === 'pen') {
      ctx.lineWidth = Math.max(1.5, pressure * 5)
    } else {
      ctx.lineWidth = Math.max(0.8, pressure * 2.5)
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = tool === 'pen'
      ? 'rgba(0,0,0,0.9)'
      : tool === 'pencil'
      ? 'rgba(30,30,30,0.55)'
      : 'rgba(0,0,0,0)'
    ctx.lineTo(...pos)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(...pos)
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    activePointers.current.delete(e.pointerId)
    if (!drawing.current) return
    drawing.current = false
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    if (tool === 'lasso' && lassoPath.current.length > 2) {
      // Clear the region enclosed by the lasso path
      const xs = lassoPath.current.map(p => p[0])
      const ys = lassoPath.current.map(p => p[1])
      const x = Math.min(...xs); const y = Math.min(...ys)
      const w = Math.max(...xs) - x; const h = Math.max(...ys) - y
      ctx.clearRect(x - 4, y - 4, w + 8, h + 8)
      lassoPath.current = []
    } else {
      ctx.beginPath()
    }
  }

  function clearCanvas() {
    const cv = canvasRef.current
    if (cv) cv.getContext('2d')?.clearRect(0, 0, cv.width, cv.height)
  }

  const drawingActive = tool !== 'off'

  const toolBtn = (t: AnnotationTool, label: string, title: string) => (
    <button
      key={t}
      onClick={() => setTool(prev => prev === t ? 'off' : t)}
      title={title}
      style={{
        width: '28px', height: '28px',
        background: tool === t ? 'var(--accent-glow)' : 'transparent',
        border: `1px solid ${tool === t ? 'var(--accent)' : 'transparent'}`,
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer', fontSize: '.75rem',
        color: tool === t ? 'var(--accent)' : 'var(--text-dim)',
      }}>
      {label}
    </button>
  )

  return (
    <div style={{ marginBottom: '22px' }}>
      <div style={{ position: 'relative', overflow: drawingActive ? undefined : 'auto', maxHeight: 'clamp(300px, 65vh, 700px)' }}>
        <object
          ref={objectRef}
          data={`${src}${retry > 0 ? `&_r=${retry}` : ''}`}
          type="application/pdf"
          className="question-pdf"
          onLoad={() => { setPdfStatus('loaded'); failCount.current = 0 }}
          style={{
            width: '100%',
            minHeight: 'clamp(280px, 55vw, 520px)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            display: 'block',
            background: 'var(--bg)',
          }}
        >
          <div style={{ padding: '20px', textAlign: 'center', fontSize: '.84rem', color: 'var(--text-dim)' }}>
            <a href={src} target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              Open question {questionNum} in new tab ↗
            </a>
          </div>
        </object>

        {/* Drawing canvas */}
        <canvas
          ref={canvasRef}
          width={900}
          height={canvasH}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            touchAction: drawingActive ? 'none' : 'auto',
            pointerEvents: drawingActive ? 'auto' : 'none',
            cursor: tool === 'eraser' ? 'cell' : tool === 'lasso' ? 'crosshair' : tool === 'off' ? 'default' : 'crosshair',
            borderRadius: 'var(--radius)',
          }}
        />

        {/* PDF error overlay */}
        {pdfStatus === 'error' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-card)', borderRadius: 'var(--radius)', gap: '10px',
          }}>
            <div style={{ fontSize: '.84rem', color: 'var(--text-dim)' }}>PDF failed to load</div>
            <button
              onClick={() => { setPdfStatus('loading'); setRetry(r => r + 1) }}
              style={{
                padding: '6px 14px', background: 'var(--accent-glow)',
                border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', fontSize: '.8rem', color: 'var(--accent)',
              }}>
              Retry
            </button>
            <a href={src} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '.76rem', color: 'var(--text-dim)', textDecoration: 'underline' }}>
              Open in new tab ↗
            </a>
          </div>
        )}

        {/* Annotation toolbar */}
        <div style={{
          position: 'absolute', top: '8px', right: '8px',
          display: 'flex', gap: '4px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px',
        }}>
          {toolBtn('off',    '👆', 'Scroll / select (drawing off)')}
          {toolBtn('pen',    '✏',  'Pen (black, pressure-sensitive)')}
          {toolBtn('pencil', '🖋',  'Pencil (soft, pressure-sensitive)')}
          {toolBtn('eraser', '⌫',  'Eraser')}
          {toolBtn('lasso',  '⊙',  'Lasso erase')}
          <div style={{ width: '1px', background: 'var(--border)', margin: '2px 2px' }} />
          <button
            onClick={() => setPencilOnly(p => !p)}
            title={pencilOnly ? 'All devices' : 'Apple Pencil / stylus only'}
            style={{
              width: '28px', height: '28px',
              background: pencilOnly ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : 'transparent',
              border: `1px solid ${pencilOnly ? 'var(--accent)' : 'transparent'}`,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontSize: '.62rem', fontWeight: 700,
              color: pencilOnly ? 'var(--accent)' : 'var(--text-dim)',
            }}>
            AP
          </button>
          <button onClick={clearCanvas} title="Clear all annotations"
            style={{
              width: '28px', height: '28px', background: 'transparent',
              border: '1px solid transparent', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontSize: '.75rem', color: 'var(--text-dim)',
            }}>
            ✕
          </button>
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
              <QuestionPdf url={q.imageUrl} questionNum={q.questionNum} />
            ) : (
              <div style={{ color: 'var(--text-dim)', fontSize: '.84rem' }}>Question unavailable</div>
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

