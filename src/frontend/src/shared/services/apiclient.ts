import {httpMethod} from '@/shared/constants';
import SessionClass from '@/shared/services/session';
import {User, Post, Session} from '@/shared/types';

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|; )_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }

  return parseJsonResponseText(text);
}

function parseJsonResponseText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Received non-JSON response from server');
  }
}

async function getErrorMessage(response: Response): Promise<string> {
  const fallbackMessage = `Request failed with status ${response.status}`;
  const text = await response.text();
  if (!text) {
    return fallbackMessage;
  }

  try {
    const data = parseJsonResponseText(text);
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
      return data.message;
    }
  } catch {
    return fallbackMessage;
  }

  return fallbackMessage;
}

class APIClient {
  async request<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
    let options: RequestInit = {
      method,
      credentials: 'include',
    };
    const headers: Record<string, string> = {};
    if (body) {
      headers['content-type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    const mutatingMethods = [httpMethod.post, httpMethod.put, httpMethod.delete, 'PATCH'];
    if (mutatingMethods.includes(method)) {
      let token = getCsrfToken();
      if (!token) {
        await fetch('/api/', { credentials: 'include' });
        token = getCsrfToken();
      }
      if (token) {
        headers['X-CSRF-Token'] = token;
      }
    }
    if (Object.keys(headers).length > 0) {
      options.headers = headers;
    }
    return fetch(url, options)
      .then((response) => {
        if (response.status === 401) {
          SessionClass.reset();
          window.location.reload();
          return Promise.reject(new Error('Unauthorized'));
        }
        if (response.status === 204) {
          return Promise.resolve(undefined as unknown as T);
        }
        if (!response.ok) {
          return getErrorMessage(response).then((message) => Promise.reject(new Error(message)));
        }
        return parseResponseBody(response) as Promise<T>;
      });
  }

  // Users

  createUser(name: string, username: string, email: string, password: string): Promise<{id: number}> {
    const url = '/api/users';
    const body = {name, username, email, password};
    return this.request<{id: number}>(url, httpMethod.post, body);
  }

  updateUser(userId: string | number, name: string, username: string, email: string, bio: string): Promise<void> {
    const url = `/api/users/${userId}`;
    const body = {name, username, email, bio};
    return this.request<void>(url, httpMethod.put, body);
  }

  updatePassword(userId: string | number, password: string, oldPassword: string): Promise<void> {
    const url = `/api/users/${userId}`;
    const body = {password, oldPassword};
    return this.request<void>(url, httpMethod.put, body);
  }

  getUser(userId: string | number): Promise<User> {
    let url = `/api/users/${userId}`;
    return this.request<User>(url, httpMethod.get);
  }

  getUserByUsername(username: string): Promise<User> {
    let url = `/api/users?username=${username}`;
    return this.request<User>(url, httpMethod.get);
  }

  searchUsers(query: string, limit: number = 5): Promise<{items: User[]}> {
    const url = `/api/users/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    return this.request<{items: User[]}>(url, httpMethod.get);
  }

  getFollowing(userId: string | number, page: number, limit: number = 20): Promise<{items: User[]}> {
    const url = `/api/users/${userId}/following?page=${page}&limit=${limit}`;
    return this.request<{items: User[]}>(url, httpMethod.get);
  }

  getFollowers(userId: string | number, page: number, limit: number = 20): Promise<{items: User[]}> {
    const url = `/api/users/${userId}/followers?page=${page}&limit=${limit}`;
    return this.request<{items: User[]}>(url, httpMethod.get);
  }

  followUser(userId: string | number): Promise<void> {
    const url = `/api/users/${userId}/following`;
    return this.request<void>(url, httpMethod.post);
  }

  unfollowUser(userId: string | number): Promise<void> {
    const url = `/api/users/${userId}/following`;
    return this.request<void>(url, httpMethod.delete);
  }

  // Sessions

  login(email: string, password: string): Promise<{id: string}> {
    const url = '/api/sessions';
    const body = {email, password};
    return this.request<{id: string}>(url, httpMethod.post, body);
  }

  logout(): Promise<void> {
    const url = '/api/sessions';
    return this.request<void>(url, httpMethod.delete);
  }

  getSessions(): Promise<{items: Session[]}> {
    const url = '/api/sessions';
    return this.request<{items: Session[]}>(url, httpMethod.get);
  }

  deleteSession(sessionId: string): Promise<void> {
    const url = `/api/sessions/${sessionId}`;
    return this.request<void>(url, httpMethod.delete);
  }

  // Posts

  createPost(content: string): Promise<{id: number}> {
    const url = '/api/posts';
    const body = {content};
    return this.request<{id: number}>(url, httpMethod.post, body);
  }

  getPost(postId: string | number): Promise<Post> {
    const url = `/api/posts/${postId}`;
    return this.request<Post>(url, httpMethod.get);
  }

  deletePost(postId: string | number): Promise<void> {
    const url = `/api/posts/${postId}`;
    return this.request<void>(url, httpMethod.delete);
  }

  getFeed(page: number): Promise<{items: Post[]}> {
    const url = `/api/posts/feed?page=${page}`;
    return this.request<{items: Post[]}>(url, httpMethod.get);
  }

  getPosts(userId: string | number, page: number): Promise<{items: Post[]}> {
    const url = `/api/users/${userId}/posts?page=${page}`;
    return this.request<{items: Post[]}>(url, httpMethod.get);
  }

  getLikes(userId: string | number, page: number): Promise<{items: Post[]}> {
    const url = `/api/users/${userId}/likes?page=${page}`;
    return this.request<{items: Post[]}>(url, httpMethod.get);
  }

  getHashtagPosts(tag: string, page: number): Promise<{items: Post[]}> {
    const url = `/api/hashtags/${encodeURIComponent(tag)}/posts?page=${page}`;
    return this.request<{items: Post[]}>(url, httpMethod.get);
  }

  likePost(postId: string | number): Promise<void> {
    const url = `/api/posts/${postId}/likes`;
    return this.request<void>(url, httpMethod.post);
  }

  unlikePost(postId: string | number): Promise<void> {
    const url = `/api/posts/${postId}/likes`;
    return this.request<void>(url, httpMethod.delete);
  }

  repostPost(postId: string | number): Promise<void> {
    const url = `/api/posts/${postId}/reposts`;
    return this.request<void>(url, httpMethod.post);
  }

  removeRepost(postId: string | number): Promise<void> {
    const url = `/api/posts/${postId}/reposts`;
    return this.request<void>(url, httpMethod.delete);
  }
}

export default APIClient;
