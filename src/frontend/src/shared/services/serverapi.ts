import { cookies } from 'next/headers';
import { User, Post } from '@/shared/types';

const API_BASE = `${process.env.API_URL || 'http://localhost:8080'}`;

export async function fetchServer(url: string, options: RequestInit = {}) {
  const cookieStore = await cookies();
  
  const headers = new Headers(options.headers || {});
  headers.set('Cookie', cookieStore.toString());
  
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    cache: 'no-store'
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
  
  return res.json();
}

export async function getCurrentUser() {
  try {
    const sessionsData = await fetchServer('/sessions');
    if (sessionsData && sessionsData.currentSessionId && sessionsData.items) {
      const currentSession = sessionsData.items.find(s => s.id === sessionsData.currentSessionId);
      if (currentSession && currentSession.userId) {
        const user = await fetchServer(`/users/${currentSession.userId}`);
        return user;
      }
    }
  } catch (e) {
    // Expected to fail if no session
  }
  return null;
}

export async function hydratePostAuthors(rawPosts: Post[], rethoughtByUser: User | null = null) {
  if (!rawPosts) return [];
  const userIds: string[] = [
    ...new Set(
      rawPosts
        .flatMap((p) => [p.userId, p.rethoughtByUserId])
        .filter(Boolean)
    ),
  ] as string[];
  
  const userMap: Record<string, User | null> = {};
  await Promise.all(
    userIds.map(async (uid: string) => {
      try {
        const u = await fetchServer(`/users/${uid}`);
        userMap[uid] = u;
      } catch {
        userMap[uid] = null;
      }
    })
  );

  return rawPosts.map((p) => {
    const post = {
      ...p,
      user: userMap[p.userId],
    };

    if (p.rethoughtByUserId) {
      post.rethoughtByUser = userMap[p.rethoughtByUserId];
    } else if (rethoughtByUser && p.userId !== rethoughtByUser.id) {
      post.rethoughtByUser = rethoughtByUser;
    }

    return post;
  });
}
