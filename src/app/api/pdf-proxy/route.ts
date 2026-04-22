import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// Allowed URL patterns — NGROK_URL takes priority; falls back to matching any
// ngrok / localhost / local-IP URL so a new ngrok session never breaks PDFs.
const NGROK_URL = process.env.NGROK_URL ?? ''

// Domains we trust for PDF proxying (all are local-only tunnels / local servers)
const ALLOWED_PATTERNS = [
  /^https?:\/\/[a-z0-9-]+\.ngrok(-free)?\.app\//i,
  /^https?:\/\/[a-z0-9-]+\.ngrok-free\.dev\//i,
  /^https?:\/\/[a-z0-9-]+\.ngrok\.io\//i,
  /^https?:\/\/localhost(:\d+)?\//i,
  /^https?:\/\/127\.0\.0\.1(:\d+)?\//i,
  /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?\//i,
  /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?\//i,
]

function isAllowedUrl(url: string): boolean {
  // If NGROK_URL is explicitly configured, check it first (exact prefix match)
  if (NGROK_URL && (url.startsWith(NGROK_URL + '/') || url === NGROK_URL)) return true
  // Fallback: match any known tunnel/local pattern
  return ALLOWED_PATTERNS.some(p => p.test(url))
}

const PDF_LOG_PATH = process.env.PDF_LOG_PATH ??
  path.join(
    'C:\\Users\\OEM\\Downloads\\scraper-claude-scrape-organize-past-papers-w635I\\database',
    'pdf-failures.log'
  )

function logFailure(url: string, reason: string) {
  try {
    const entry = `${new Date().toISOString()} ${reason} ${url}\n`
    fs.appendFileSync(PDF_LOG_PATH, entry, 'utf8')
  } catch {
    // log dir might not exist in production — silently skip
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url param' }, { status: 400 })

  // Security: only proxy URLs from our known PDF server patterns
  if (!isAllowedUrl(url)) {
    console.error(`[pdf-proxy] Blocked URL (not in allowlist): ${url.slice(0, 80)}`)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15_000)

  let upstream: Response
  try {
    upstream = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'ngrok-skip-browser-warning': '1',
        'User-Agent': 'RevisionPlatform/1.0',
      },
    })
  } catch (err) {
    clearTimeout(timer)
    const isTimeout = (err as Error).name === 'AbortError'
    const reason = isTimeout ? 'TIMEOUT' : 'FETCH_ERROR'
    console.error(`[pdf-proxy] ${reason}:`, err)
    logFailure(url, reason)
    return NextResponse.json(
      { error: isTimeout ? 'PDF server timed out' : 'Failed to reach PDF server' },
      { status: 502 }
    )
  } finally {
    clearTimeout(timer)
  }

  if (!upstream.ok) {
    logFailure(url, `HTTP_${upstream.status}`)
    console.error(`[pdf-proxy] Upstream ${upstream.status} for ${url}`)
    return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 })
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
