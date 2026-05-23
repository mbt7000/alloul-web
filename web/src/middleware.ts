import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/integrations', '/workspace', '/notifications', '/messages', '/profile', '/settings'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some(path => pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();

  // Token is in localStorage (client-side only) — we use a cookie as the server-side signal.
  // The login page sets alloul_auth=1 cookie after successful login.
  const authCookie = request.cookies.get('alloul_auth');
  if (authCookie?.value === '1') return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/integrations/:path*', '/workspace/:path*', '/notifications/:path*', '/messages/:path*', '/profile/:path*', '/settings/:path*'],
};
