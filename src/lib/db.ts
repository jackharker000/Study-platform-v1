import { PrismaClient } from '@prisma/client'

// On Vercel the only writable directory is /tmp
const DB_URL = process.env.VERCEL
  ? 'file:/tmp/dev.db'
  : `file:${process.cwd()}/prisma/dev.db`

function makePrisma() {
  return new PrismaClient({
    datasourceUrl: DB_URL,
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? makePrisma()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// ─── Schema bootstrap ─────────────────────────────────────────────
// Runs once per cold-start. Creates tables if they don't exist yet
// so the app works on Vercel without a migration step.

let ready = false

export async function ensureDb(): Promise<void> {
  if (ready) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id"          TEXT    NOT NULL PRIMARY KEY,
        "subject"     TEXT,
        "mode"        TEXT    NOT NULL DEFAULT 'practice',
        "filters"     TEXT    NOT NULL DEFAULT '{}',
        "questionIds" TEXT    NOT NULL,
        "currentIdx"  INTEGER NOT NULL DEFAULT 0,
        "status"      TEXT    NOT NULL DEFAULT 'active',
        "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Answer" (
        "id"          TEXT    NOT NULL PRIMARY KEY,
        "sessionId"   TEXT    NOT NULL,
        "questionId"  TEXT    NOT NULL,
        "subject"     TEXT    NOT NULL,
        "topic"       TEXT    NOT NULL,
        "difficulty"  TEXT    NOT NULL,
        "qType"       TEXT    NOT NULL,
        "userAnswer"  TEXT    NOT NULL,
        "correct"     BOOLEAN,
        "score"       INTEGER,
        "maxScore"    INTEGER,
        "confidence"  TEXT,
        "timeMs"      INTEGER,
        "gradingType" TEXT    NOT NULL DEFAULT 'auto',
        "aiFeedback"  TEXT,
        "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UploadedFile" (
        "id"           TEXT    NOT NULL PRIMARY KEY,
        "originalName" TEXT    NOT NULL,
        "mimeType"     TEXT    NOT NULL,
        "size"         INTEGER NOT NULL,
        "storagePath"  TEXT    NOT NULL,
        "status"       TEXT    NOT NULL DEFAULT 'pending',
        "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ExtractedQuestion" (
        "id"            TEXT    NOT NULL PRIMARY KEY,
        "fileId"        TEXT    NOT NULL,
        "subject"       TEXT,
        "paper"         TEXT,
        "topic"         TEXT,
        "questionType"  TEXT,
        "marks"         INTEGER,
        "prompt"        TEXT    NOT NULL,
        "optionsJson"   TEXT,
        "correctAnswer" TEXT,
        "markScheme"    TEXT,
        "sourcePage"    INTEGER,
        "questionLabel" TEXT,
        "verified"      BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("fileId") REFERENCES "UploadedFile" ("id") ON DELETE CASCADE
      )
    `)
    ready = true
  } catch (err) {
    console.error('[db] ensureDb failed:', err)
  }
}

export default prisma
