import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// Public paths that don't require login
const PUBLIC_PATHS = ['/login', '/register', '/api/auth']

export default auth(req => {
  const { pathname } = req.nextUrl

  // Allow public paths and static assets
  const isPublic =
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/api/pdf-proxy')  // PDFs must be accessible without login

  if (!req.auth && !isPublic) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(loginUrl)
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
