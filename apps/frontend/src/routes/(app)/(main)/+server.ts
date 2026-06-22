import { json } from "@sveltejs/kit";
import { getFeed } from "$lib/domains/posts/api.server";

export const GET = async ({ fetch, url }) => {
  const cursor = url.searchParams.get("cursor") ?? "";
  const feed = await getFeed(fetch, cursor);
  return json(feed ?? { items: [], nextCursor: null });
};
