import { json } from "@sveltejs/kit";
import { getHashtagPosts } from "$lib/domains/posts/api.server";
import { apiClient } from "$lib/server/api/client";

export const GET = async (event) => {
  if (!event.cookies.get("session")) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const cursor = event.url.searchParams.get("cursor") ?? "";
  try {
    const feed = await getHashtagPosts(
      apiClient(event),
      event.params.tag,
      cursor,
    );
    return json(feed ?? { items: [], nextCursor: null });
  } catch (e) {
    console.error("Failed to load hashtag posts:", e);
    return json({ items: [], nextCursor: null });
  }
};
