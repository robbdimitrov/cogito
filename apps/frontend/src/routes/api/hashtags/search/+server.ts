import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { searchHashtags } from "$lib/domains/posts/api.server";
import { apiClient } from "$lib/server/api/client";

export const GET: RequestHandler = async (event) => {
  const query = event.url.searchParams.get("query");
  if (!query) {
    return json({ items: [] });
  }

  const limit = parseInt(event.url.searchParams.get("limit") || "5", 10);

  try {
    const res = await searchHashtags(apiClient(event), query, limit);
    return json(res);
  } catch {
    return json({ items: [] });
  }
};
