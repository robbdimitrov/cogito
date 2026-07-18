import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { apiClient } from "$lib/server/api/client";
import { unwrap } from "$lib/server/api/http";
import { getHashtagPosts } from "$lib/domains/posts/api.server";

const VALID_TYPES = new Set([
  "all",
  "posts",
  "users",
  "hashtags",
  "hashtag-posts",
]);
const EMPTY_PAGE = { items: [], nextCursor: null };

export const GET: RequestHandler = async (event) => {
  const q = event.url.searchParams.get("q") ?? "";
  const type = event.url.searchParams.get("type") ?? "posts";
  const cursor = event.url.searchParams.get("cursor") ?? "";
  const limit = event.url.searchParams.get("limit") ?? "20";

  if (!q || !VALID_TYPES.has(type)) {
    return json(EMPTY_PAGE);
  }

  if (type === "hashtag-posts") {
    try {
      const page = await getHashtagPosts(
        apiClient(event),
        q.replace(/^#/, ""),
        cursor,
        Number(limit),
      );
      return json(page);
    } catch {
      return json(EMPTY_PAGE);
    }
  }

  const params = new URLSearchParams({ q, type, limit });
  if (cursor) params.set("cursor", cursor);
  try {
    const res = await apiClient(event)(`/search?${params}`);
    return json(
      (await unwrap<{ items: unknown[]; nextCursor: string | null }>(res)) ??
        EMPTY_PAGE,
    );
  } catch {
    return json(EMPTY_PAGE);
  }
};
