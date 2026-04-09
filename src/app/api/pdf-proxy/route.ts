import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ALLOWED_ORIGIN =
  process.env.NGROK_URL ?? 'https://unrevertible-unmaledictory-lucie.ngrok-free.dev'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url param' }, { status: 400 })

  // Security: only proxy URLs from our configured PDF server
  if (!url.startsWith(ALLOWED_ORIGIN + '/') && url !== ALLOWED_ORIGIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let upstream: Response
  try {
    upstream = await fetch(url, {
      headers: {
        // Skip ngrok's browser warning page
        'ngrok-skip-browser-warning': '1',
        'User-Agent': 'RevisionPlatform/1.0',
      },
    })
  } catch (err) {
    console.error('[pdf-proxy] fetch error:', err)
    return NextResponse.json({ error: 'Failed to reach PDF server' }, { status: 502 })
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 })
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      // Cache for 1 hour — PDFs don't change between requests
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
