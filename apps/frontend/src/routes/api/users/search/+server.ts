import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { searchUsers } from "$lib/domains/users/api.server";
import { apiClient } from "$lib/server/api/client";

export const GET: RequestHandler = async (event) => {
  const query = event.url.searchParams.get("query");
  if (!query) {
    return json({ items: [] });
  }

  const limit = Math.min(
    parseInt(event.url.searchParams.get("limit") || "5", 10) || 5,
    50,
  );

  try {
    const res = await searchUsers(apiClient(event), query, limit);
    return json(res);
  } catch (e) {
    console.error("Failed to search users:", e);
    return json({ items: [] });
  }
};
