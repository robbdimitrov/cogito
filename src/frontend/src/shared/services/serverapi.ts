import { cookies } from 'next/headers';
import { cache } from 'react';
import type { User, Post } from '@/shared/types';

const API_BASE = `${process.env.API_URL || 'http://localhost:8080'}`;

interface SessionsResponse {
  currentSessionId?: string;
  items?: Array<{ id: string; userId: string }>;
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
    const sessions = sessionsData ? (sessionsData.sessions || sessionsData.items) : null;
    if (sessionsData && sessionsData.currentSessionId && sessions) {
      const currentSession = sessions.find(s => s.id === sessionsData.currentSessionId);
      if (currentSession && currentSession.userId) {
        const user = await fetchServer<User>(`/users/${currentSession.userId}`);
        return user;
      }
    }
  } catch {
    return null;
  }
});

export const getUserByUsername = cache(async function getUserByUsername(username: string) {
  return fetchServer<User>(`/users?username=${encodeURIComponent(username)}`);
});

export const getUserById = cache(async function getUserById(userId: string | number) {
  return fetchServer<User>(`/users/${userId}`);
});

export const getServerSessions = cache(async function getServerSessions() {
  return fetchServer<SessionsResponse>('/sessions');
});

export async function hydratePostAuthors(rawPosts: Post[], repostByUser: User | null = null) {
  if (!rawPosts) return [];
  const userIds: string[] = [
    ...new Set(
      rawPosts
        .flatMap((p) => [p.userId, p.repostByUserId, p.quotePost?.userId])
        .filter(Boolean)
    ),
  ] as string[];

  const userMap: Record<string, User | undefined> = {};
  await Promise.all(
    userIds.map(async (uid: string) => {
      try {
        const u = await getUserById(uid);
        userMap[uid] = u ?? undefined;
      } catch {
        userMap[uid] = undefined;
      }
    })
  );

  return rawPosts.map((p) => {
    const post = {
      ...p,
      user: userMap[p.userId],
    };

    if (p.repostByUserId) {
      post.repostByUser = userMap[p.repostByUserId];
    } else if (repostByUser && p.userId !== repostByUser.id) {
      post.repostByUser = repostByUser;
    }

    if (p.quotePost?.userId) {
      post.quotePost = { ...p.quotePost, user: userMap[p.quotePost.userId] };
    }

    return post;
  });
}
