import { json } from "@sveltejs/kit";
import { getHashtagPosts } from "$lib/domains/posts/api.server";

export const GET = async ({ fetch, params, url }) => {
  const page = Number(url.searchParams.get("page") ?? "0");
  try {
    const feed = await getHashtagPosts(fetch, params.tag, page);
    return json(feed?.items ?? []);
  } catch (e) {
    return json([]);
  }
};
