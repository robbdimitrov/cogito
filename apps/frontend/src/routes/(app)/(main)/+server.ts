import { json } from "@sveltejs/kit";
import { getFeed } from "$lib/domains/posts/api.server";

export const GET = async ({ fetch, url }) => {
  const page = Number(url.searchParams.get("page") ?? "0");
  const feed = await getFeed(fetch, page);
  return json(feed?.items ?? []);
};
