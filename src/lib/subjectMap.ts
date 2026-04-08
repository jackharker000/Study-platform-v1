/**
 * Maps the app's subject IDs to the Turso database's level + subject format.
 * The Turso `questions` table uses subject names like "Biology-0610" and
 * level values like "IGCSE" or "AS_Level".
 *
 * Run `SELECT DISTINCT level, subject FROM questions` against the live DB
 * to verify these mappings if question counts appear wrong.
 */
export interface TursoSubjectKey {
  level: string
  subject: string
}

export const SUBJECT_TO_TURSO: Record<string, TursoSubjectKey> = {
  as_physics:   { level: 'AS_Level', subject: 'Physics-9702' },
  as_maths:     { level: 'AS_Level', subject: 'Mathematics-9709' },
  ig_biology:   { level: 'IGCSE',    subject: 'Biology-0610' },
  ig_chemistry: { level: 'IGCSE',    subject: 'Chemistry-0620' },
  ig_economics: { level: 'IGCSE',    subject: 'Economics-0455' },
  ig_english:   { level: 'IGCSE',    subject: 'English-0475' },
}

export function getTursoSubject(appSubjectId: string): TursoSubjectKey | null {
  return SUBJECT_TO_TURSO[appSubjectId] ?? null
}
