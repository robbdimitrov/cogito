import { json } from "@sveltejs/kit";
import { getLikedPosts } from "$lib/domains/posts/api.server";
import {
  getFollowers,
  getFollowing,
  getUser,
} from "$lib/domains/users/api.server";
import { apiClient } from "$lib/server/api/client";

export const GET = async (event) => {
  const { params, url } = event;
  const cursor = url.searchParams.get("cursor") ?? "";
  const tab = params.tab;
  const cleanUsername = decodeURIComponent(params.username).replace(/^@/, "");

  try {
    const user = await getUser(apiClient(event), cleanUsername);
    if (tab === "likes") {
      const feed = await getLikedPosts(apiClient(event), user.id, cursor);
      return json(feed ?? { items: [], nextCursor: null });
    } else if (tab === "followers") {
      const userPage = await getFollowers(apiClient(event), user.id, cursor);
      return json(userPage ?? { items: [], nextCursor: null });
    } else if (tab === "following") {
      const userPage = await getFollowing(apiClient(event), user.id, cursor);
      return json(userPage ?? { items: [], nextCursor: null });
    }
    return json({ items: [], nextCursor: null });
  } catch (e) {
    return json({ items: [], nextCursor: null });
  }
};
