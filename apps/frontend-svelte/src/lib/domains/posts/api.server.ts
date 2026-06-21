import type { Post } from "./model";
import {
  apiRequest,
  jsonRequest,
  type ServerFetch,
} from "$lib/shared/transport.server";

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

export function getFeed(
  fetch: ServerFetch,
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getPage(fetch, "/api/posts/feed", page, limit);
}

export function getUserPosts(
  fetch: ServerFetch,
  userID: string | number,
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getPage(fetch, `/api/users/${userID}/posts`, page, limit);
}

export function getLikedPosts(
  fetch: ServerFetch,
  userID: string | number,
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getPage(fetch, `/api/users/${userID}/likes`, page, limit);
}

export function getHashtagPosts(
  fetch: ServerFetch,
  tag: string,
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getPage(
    fetch,
    `/api/hashtags/${encodeURIComponent(tag)}/posts`,
    page,
    limit,
  );
}

export function getPost(
  fetch: ServerFetch,
  postID: string | number,
): Promise<Post> {
  return apiRequest(fetch, `/api/posts/${postID}`);
}

export function getReplies(
  fetch: ServerFetch,
  postID: string | number,
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<PostPage> {
  return getPage(fetch, `/api/posts/${postID}/replies`, page, limit);
}

export function create(
  fetch: ServerFetch,
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

  return apiRequest(fetch, "/api/posts", jsonRequest("POST", body));
}

export function deletePost(
  fetch: ServerFetch,
  postID: string | number,
): Promise<void> {
  return postMutation(fetch, postID, "", "DELETE");
}

export function like(
  fetch: ServerFetch,
  postID: string | number,
): Promise<void> {
  return postMutation(fetch, postID, "likes", "POST");
}

export function unlike(
  fetch: ServerFetch,
  postID: string | number,
): Promise<void> {
  return postMutation(fetch, postID, "likes", "DELETE");
}

export function repost(
  fetch: ServerFetch,
  postID: string | number,
): Promise<void> {
  return postMutation(fetch, postID, "reposts", "POST");
}

export function removeRepost(
  fetch: ServerFetch,
  postID: string | number,
): Promise<void> {
  return postMutation(fetch, postID, "reposts", "DELETE");
}

function getPage(
  fetch: ServerFetch,
  path: string,
  page: number,
  limit: number,
): Promise<PostPage> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return apiRequest(fetch, `${path}?${query}`);
}

function postMutation(
  fetch: ServerFetch,
  postID: string | number,
  suffix: "" | "likes" | "reposts",
  method: "POST" | "DELETE",
): Promise<void> {
  const path = suffix
    ? `/api/posts/${postID}/${suffix}`
    : `/api/posts/${postID}`;
  return apiRequest(fetch, path, { method });
}
