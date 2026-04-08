import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// Global singleton to avoid multiple Prisma clients in dev (hot reload)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient(): PrismaClient {
  if (!process.env.TURSO_URL) {
    // Local dev fallback: use SQLite file
    return new PrismaClient()
  }
  const adapter = new PrismaLibSql({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_TOKEN,
  })
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
