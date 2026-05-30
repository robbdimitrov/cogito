import { NextResponse } from 'next/server';

export function proxy(request) {
  const session = request.cookies.get('session');
  const path = request.nextUrl.pathname;

  const isProtectedRoute = path.startsWith('/settings');
  const isAuthRoute = path === '/login' || path === '/signup';

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/settings/:path*', '/login', '/signup'],
};
