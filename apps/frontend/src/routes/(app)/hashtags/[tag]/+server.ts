import { json } from "@sveltejs/kit";
import { getHashtagPosts } from "$lib/domains/posts/api.server";

export const GET = async ({ fetch, params, url }) => {
  const cursor = url.searchParams.get("cursor") ?? "";
  try {
    const feed = await getHashtagPosts(fetch, params.tag, cursor);
    return json(feed ?? { items: [], nextCursor: null });
  } catch (e) {
    return json({ items: [], nextCursor: null });
  }
};
