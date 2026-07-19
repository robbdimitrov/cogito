import { json } from "@sveltejs/kit";
import { getReplies } from "$lib/domains/posts/api.server";
import { apiClient } from "$lib/server/api/client";

export const GET = async (event) => {
  if (!event.cookies.get("session")) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const { params, url } = event;
  const cursor = url.searchParams.get("cursor") ?? "";
  const replies = await getReplies(apiClient(event), params.id, cursor);
  return json(replies ?? { items: [], nextCursor: null });
};
