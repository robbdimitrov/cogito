import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { apiClient } from "$lib/server/api/client";
import { unwrap } from "$lib/server/api/http";

const VALID_TYPES = new Set(["all", "posts", "users", "hashtags"]);

export const GET: RequestHandler = async (event) => {
  const q = event.url.searchParams.get("q") ?? "";
  const type = event.url.searchParams.get("type") ?? "posts";
  const cursor = event.url.searchParams.get("cursor") ?? "";
  const limit = event.url.searchParams.get("limit") ?? "20";

  if (!q || !VALID_TYPES.has(type)) {
    return json({ items: [], nextCursor: null });
  }

  const params = new URLSearchParams({ q, type, limit });
  if (cursor) params.set("cursor", cursor);
  try {
    const res = await apiClient(event)(`/search?${params}`);
    return json(
      (await unwrap<{ items: unknown[]; nextCursor: string | null }>(res)) ?? {
        items: [],
        nextCursor: null,
      },
    );
  } catch {
    return json({ items: [], nextCursor: null });
  }
};
