import type { Post } from "./model";
import type { ApiClient } from "$lib/server/api/client";
import { unwrap } from "$lib/server/api/http";

const DEFAULT_PAGE_SIZE = 20;

interface Identifier {
  id: number;
}

export interface PostPage {
  items: Post[];
  nextCursor: string | null;
}

export interface Hashtag {
  id: number;
  name: string;
  postCount: number;
}

export interface CreatePostInput {
  content: string;
  mediaKey?: string;
  inReplyToId?: string | number;
  quoteOfId?: string | number;
}

export async function getFeed(
  api: ApiClient,
  cursor = "",
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getCursorPage(api, "/posts/feed", cursor, limit);
}

export async function getUserPosts(
  api: ApiClient,
  userID: string | number,
  cursor = "",
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getCursorPage(api, `/users/${userID}/posts`, cursor, limit);
}

export async function getUserReplies(
  api: ApiClient,
  userID: string | number,
  cursor = "",
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getCursorPage(api, `/users/${userID}/replies`, cursor, limit);
}

export async function getLikedPosts(
  api: ApiClient,
  userID: string | number,
  cursor = "",
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getCursorPage(api, `/users/${userID}/likes`, cursor, limit);
}

export async function getHashtagPosts(
  api: ApiClient,
  tag: string,
  cursor = "",
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getCursorPage(
    api,
    `/hashtags/${encodeURIComponent(tag)}/posts`,
    cursor,
    limit,
  );
}

export async function getPopularPosts(
  api: ApiClient,
  cursor = "",
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getCursorPage(api, "/search/popular", cursor, limit);
}

export async function getPost(
  api: ApiClient,
  postID: string | number,
): Promise<Post> {
  const res = await api(`/posts/${postID}`);
  const unwrapped = await unwrap<Post>(res);
  return unwrapped!;
}

export async function getReplies(
  api: ApiClient,
  postID: string | number,
  cursor = "",
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getCursorPage(api, `/posts/${postID}/replies`, cursor, limit);
}

export async function create(
  api: ApiClient,
  input: CreatePostInput,
): Promise<Identifier> {
  const body: Record<string, unknown> = {
    content: input.content,
    mediaKey: input.mediaKey,
  };
  if (input.inReplyToId !== undefined) {
    body.inReplyToId = Number(input.inReplyToId);
  }
  if (input.quoteOfId !== undefined) {
    body.quoteOfId = Number(input.quoteOfId);
  }

  const res = await api("/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const unwrapped = await unwrap<Identifier>(res);
  return unwrapped!;
}

export function deletePost(
  api: ApiClient,
  postID: string | number,
): Promise<void> {
  return postMutation(api, postID, "", "DELETE");
}

export function like(api: ApiClient, postID: string | number): Promise<void> {
  return postMutation(api, postID, "likes", "POST");
}

export function unlike(api: ApiClient, postID: string | number): Promise<void> {
  return postMutation(api, postID, "likes", "DELETE");
}

export function repost(api: ApiClient, postID: string | number): Promise<void> {
  return postMutation(api, postID, "reposts", "POST");
}

export function removeRepost(
  api: ApiClient,
  postID: string | number,
): Promise<void> {
  return postMutation(api, postID, "reposts", "DELETE");
}

async function getCursorPage(
  api: ApiClient,
  path: string,
  cursor: string,
  limit: number,
): Promise<PostPage> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  const res = await api(`${path}?${query}`);
  const unwrapped = await unwrap<PostPage>(res);
  return unwrapped ?? { items: [], nextCursor: null };
}

async function postMutation(
  api: ApiClient,
  postID: string | number,
  suffix: "" | "likes" | "reposts",
  method: "POST" | "DELETE",
): Promise<void> {
  const path = suffix ? `/posts/${postID}/${suffix}` : `/posts/${postID}`;
  const res = await api(path, { method });
  await unwrap<null>(res);
}
