import { NextRequest } from 'next/server';

const API_BASE = process.env.API_URL || 'http://localhost:8080';

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const {path} = await context.params;
  const target = new URL(`/${path.join('/')}${request.nextUrl.search}`, API_BASE);
  const headers = new Headers(request.headers);

  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    (init as any).duplex = 'half';
  }

  const response = await fetch(target, init);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
