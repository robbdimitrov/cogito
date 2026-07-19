import { json } from "@sveltejs/kit";
import { getLikedPosts, getUserReplies } from "$lib/domains/posts/api.server";
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
    // Client passes the already-resolved user ID to skip a redundant lookup;
    // fall back to resolving by username if it's missing.
    const userID =
      parseIdParam(url.searchParams.get("userId")) ??
      (
        await getUser(
          apiClient(event),
          decodeURIComponent(params.username).replace(/^@/, ""),
        )
      ).id;
    if (tab === "replies") {
      const feed = await getUserReplies(apiClient(event), userID, cursor);
      return json(feed ?? { items: [], nextCursor: null });
    } else if (tab === "likes") {
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
