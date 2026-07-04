import { json } from "@sveltejs/kit";
import { getLikedPosts } from "$lib/domains/posts/api.server";
import {
  getFollowers,
  getFollowing,
  getUser,
} from "$lib/domains/users/api.server";
import { apiClient } from "$lib/server/api/client";
import { parseIdParam } from "$lib/server/api/http";

export const GET = async (event) => {
  if (!event.cookies.get("session")) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const { params, url } = event;
  const cursor = url.searchParams.get("cursor") ?? "";
  const tab = params.tab;

  try {
    // The client already resolved the profile user on initial page load and
    // passes its ID along, so pagination requests skip a redundant username
    // lookup. Fall back to resolving by username if the ID is missing.
    const userID =
      parseIdParam(url.searchParams.get("userId")) ??
      (
        await getUser(
          apiClient(event),
          decodeURIComponent(params.username).replace(/^@/, ""),
        )
      ).id;
    if (tab === "likes") {
      const feed = await getLikedPosts(apiClient(event), userID, cursor);
      return json(feed ?? { items: [], nextCursor: null });
    } else if (tab === "followers") {
      const userPage = await getFollowers(apiClient(event), userID, cursor);
      return json(userPage ?? { items: [], nextCursor: null });
    } else if (tab === "following") {
      const userPage = await getFollowing(apiClient(event), userID, cursor);
      return json(userPage ?? { items: [], nextCursor: null });
    }
    return json({ items: [], nextCursor: null });
  } catch (e) {
    console.error("Failed to load tab data:", e);
    return json({ items: [], nextCursor: null });
  }
};
