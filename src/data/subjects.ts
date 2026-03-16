import type { Subject } from '@/types'

export const SUBJECTS: Subject[] = [
  { id: 'as_physics',    name: 'AS Physics',         level: 'AS',    syllabus: '9702', color: '#3b82f6', icon: '⚛' },
  { id: 'as_maths',      name: 'AS Mathematics',     level: 'AS',    syllabus: '9709', color: '#a855f7', icon: '∑' },
  { id: 'ig_biology',   name: 'IGCSE Biology',       level: 'IGCSE', syllabus: '0610', color: '#22c55e', icon: '🧬' },
  { id: 'ig_chemistry', name: 'IGCSE Chemistry',     level: 'IGCSE', syllabus: '0620', color: '#f59e0b', icon: '⚗' },
  { id: 'ig_economics', name: 'IGCSE Economics',     level: 'IGCSE', syllabus: '0455', color: '#06b6d4', icon: '📊' },
  { id: 'ig_english',   name: 'IGCSE English Lit',   level: 'IGCSE', syllabus: '0475', color: '#ec4899', icon: '📖' },
]

export const SUBJECT_MAP = Object.fromEntries(SUBJECTS.map(s => [s.id, s]))
