import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  const path = request.nextUrl.pathname;

  const isProtectedRoute = path.startsWith('/settings');
  const isAuthRoute = path === '/login' || path === '/signup';

  let isValidSession = false;

  if (session) {
    try {
      const res = await fetch(`${process.env.API_URL || 'http://localhost:8080'}/sessions`, {
        headers: { Cookie: `session=${session.value}` },
        cache: 'no-store'
      });
      if (res.ok) {
        isValidSession = true;
      }
    } catch (e) {
      // In case of error (e.g. API down), we might just assume invalid or allow through.
      // Assuming invalid to be safe.
      console.error('Middleware session validation failed:', e);
    }
  }

  if (isProtectedRoute && !isValidSession) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    if (session) {
      response.cookies.delete('session');
    }
    return response;
  }

  if (isAuthRoute && isValidSession) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (session && !isValidSession) {
    const response = NextResponse.next();
    response.cookies.delete('session');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/settings/:path*', '/login', '/signup'],
};
