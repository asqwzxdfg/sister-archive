import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/pending', '/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/health'];
const ADMIN_PATHS = ['/admin', '/api/users', '/api/audit'];
const EDITOR_PATHS = ['/upload', '/api/media/upload'];

function parseJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/icons') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = parseJwtPayload(token);
  if (!payload) {
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: '세션이 만료되었습니다' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  }

  // Check approval
  if (!payload.approved) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '계정 승인 대기 중입니다' }, { status: 403 });
    }
    if (pathname !== '/pending') {
      return NextResponse.redirect(new URL('/pending', request.url));
    }
    return NextResponse.next();
  }

  // Redirect approved users away from auth pages
  if (['/login', '/register', '/pending'].includes(pathname)) {
    return NextResponse.redirect(new URL('/years', request.url));
  }

  // Admin route protection
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p)) && payload.role !== 'OWNER') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/years', request.url));
  }

  // Editor route protection
  if (EDITOR_PATHS.some((p) => pathname.startsWith(p)) && !['OWNER', 'EDITOR'].includes(payload.role)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/years', request.url));
  }

  // Attach user info to headers
  const response = NextResponse.next();
  response.headers.set('x-user-id', payload.sub);
  response.headers.set('x-user-role', payload.role);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts|icons).*)'],
};
