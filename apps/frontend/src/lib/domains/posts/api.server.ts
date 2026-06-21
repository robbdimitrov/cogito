import type { Post } from "./model";
import type { ApiClient } from "$lib/server/api/client";
import { unwrap } from "$lib/server/api/http";

const DEFAULT_PAGE_SIZE = 20;

interface Identifier {
  id: number;
}

interface PostPage {
  items: Post[];
}

export interface CreatePostInput {
  content: string;
  mediaKey?: string;
  inReplyToId?: string | number;
  quoteOfId?: string | number;
}

export async function getFeed(
  api: ApiClient,
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getPage(api, "/posts/feed", page, limit);
}

export async function getUserPosts(
  api: ApiClient,
  userID: string | number,
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getPage(api, `/users/${userID}/posts`, page, limit);
}

export async function getLikedPosts(
  api: ApiClient,
  userID: string | number,
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getPage(api, `/users/${userID}/likes`, page, limit);
}

export async function getHashtagPosts(
  api: ApiClient,
  tag: string,
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getPage(
    api,
    `/hashtags/${encodeURIComponent(tag)}/posts`,
    page,
    limit,
  );
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
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getPage(api, `/posts/${postID}/replies`, page, limit);
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

async function getPage(
  api: ApiClient,
  path: string,
  page: number,
  limit: number,
): Promise<PostPage> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const res = await api(`${path}?${query}`);
  const unwrapped = await unwrap<PostPage>(res);
  return unwrapped ?? { items: [] };
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
