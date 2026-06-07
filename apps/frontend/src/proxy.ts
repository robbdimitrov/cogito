import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const session = request.cookies.get('session');
  const path = request.nextUrl.pathname;

  if (path.startsWith('/api/')) {
    return NextResponse.next();
  }

  const isAuthRoute = path === '/login' || path === '/signup';

  let sessionStatus: 'valid' | 'invalid' | 'error' = 'invalid';

  if (session) {
    try {
      const res = await fetch(`${process.env.API_URL || 'http://localhost:8080'}/sessions`, {
        headers: { Cookie: `session=${session.value}` },
        cache: 'no-store'
      });
      if (res.ok) {
        sessionStatus = 'valid';
      } else if (res.status === 401 || res.status === 403) {
        sessionStatus = 'invalid';
      } else {
        sessionStatus = 'error';
      }
    } catch (e) {
      console.error('Middleware session validation failed:', e);
      sessionStatus = 'error';
    }
  }

  // If it's an auth route (/login or /signup) and session is valid, redirect to homepage
  if (isAuthRoute) {
    if (sessionStatus === 'valid') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    const response = NextResponse.next();
    // Only clear the cookie if the backend explicitly rejected it
    if (sessionStatus === 'invalid' && session) {
      response.cookies.delete('session');
    }
    return response;
  }

  // For all other routes
  if (sessionStatus === 'invalid') {
    const response = NextResponse.redirect(new URL('/login', request.url));
    if (session) {
      response.cookies.delete('session');
    }
    return response;
  }

  // If sessionStatus === 'error' (backend down), we let the request through.
  // We do NOT delete the cookie, preventing accidental logouts on redeploys.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
