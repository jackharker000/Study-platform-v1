import { createClient, type Client } from '@libsql/client'

let _client: Client | null = null

export function getTursoClient(): Client {
  if (!_client) {
    if (!process.env.TURSO_URL) throw new Error('TURSO_URL environment variable is not set')
    _client = createClient({
      url: process.env.TURSO_URL,
      authToken: process.env.TURSO_TOKEN,
    })
  }
  return _client
}

export function isTursoConfigured(): boolean {
  return Boolean(process.env.TURSO_URL)
}
