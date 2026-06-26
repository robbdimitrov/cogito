import { json } from "@sveltejs/kit";
import { getUserPosts } from "$lib/domains/posts/api.server";
import { getUser } from "$lib/domains/users/api.server";
import { apiClient } from "$lib/server/api/client";

export const GET = async (event) => {
  if (!event.cookies.get("session")) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const { params, url } = event;
  const cursor = url.searchParams.get("cursor") ?? "";
  const cleanUsername = decodeURIComponent(params.username).replace(/^@/, "");
  try {
    const user = await getUser(apiClient(event), cleanUsername);
    const feed = await getUserPosts(apiClient(event), user.id, cursor);
    return json(feed ?? { items: [], nextCursor: null });
  } catch (e) {
    console.error("Failed to load user posts:", e);
    return json({ items: [], nextCursor: null });
  }
};
