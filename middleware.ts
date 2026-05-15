import { NextRequest, NextResponse } from 'next/server'

const publicPaths = ['/login', '/api/auth/login', '/api/auth/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(`${path}/`))
  const isStaticAsset =
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.[a-z0-9]+$/i)

  if (isPublicPath || isStaticAsset) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth-token')?.value

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
