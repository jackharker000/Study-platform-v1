import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const ALLOWED_ORIGIN =
  process.env.NGROK_URL ?? 'https://unrevertible-unmaledictory-lucie.ngrok-free.dev'

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

  // Security: only proxy URLs from our configured PDF server
  if (!url.startsWith(ALLOWED_ORIGIN + '/') && url !== ALLOWED_ORIGIN) {
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
