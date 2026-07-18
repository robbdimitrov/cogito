import { json } from "@sveltejs/kit";
import { getPopularPosts } from "$lib/domains/posts/api.server";
import { apiClient } from "$lib/server/api/client";

export const GET = async (event) => {
  if (!event.cookies.get("session")) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const cursor = event.url.searchParams.get("cursor") ?? "";
  const popular = await getPopularPosts(apiClient(event), cursor);
  return json(popular);
};
