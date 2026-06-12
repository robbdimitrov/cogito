import { cookies } from 'next/headers';
import { cache } from 'react';
import type { User } from '@/shared/types';

const API_BASE = `${process.env.API_URL || 'http://localhost:8080'}`;

interface SessionsResponse {
  currentSessionId?: string;
  sessions?: Array<{ id: string; userId: string }>;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Received non-JSON response from server');
  }
}

export async function fetchServer<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T | null> {
  const cookieStore = await cookies();

  const headers = new Headers(options.headers || {});
  headers.set('Cookie', cookieStore.toString());

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (res.status === 204) {
    return null;
  }

  if (!res.ok) {
    if (res.status === 401) {
      return null;
    }
    throw new Error('Failed to fetch data');
  }

  return parseResponse(res) as Promise<T>;
}

export const getCurrentUser = cache(async function getCurrentUser() {
  try {
    const sessionsData = await getServerSessions();
    const sessions = sessionsData?.sessions ?? null;
    if (sessionsData && sessionsData.currentSessionId && sessions) {
      const currentSession = sessions.find(s => s.id === sessionsData.currentSessionId);
      if (currentSession && currentSession.userId) {
        const user = await fetchServer<User>(`/users/${currentSession.userId}`);
        return user;
      }
    }
    return null;
  } catch {
    return null;
  }
});

export const getUserByUsername = cache(async function getUserByUsername(username: string) {
  return fetchServer<User>(`/users?username=${encodeURIComponent(username)}`);
});

export const getServerSessions = cache(async function getServerSessions() {
  return fetchServer<SessionsResponse>('/sessions');
});
