import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const session = request.cookies.get('session');
  const path = request.nextUrl.pathname;

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
      console.error('Middleware session validation failed:', e);
    }
  }

  // If it's an auth route (/login or /signup) and session is valid, redirect to homepage
  if (isAuthRoute) {
    if (isValidSession) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // For all other routes, if session is invalid, redirect to /login
  if (!isValidSession) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    if (session) {
      response.cookies.delete('session');
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
