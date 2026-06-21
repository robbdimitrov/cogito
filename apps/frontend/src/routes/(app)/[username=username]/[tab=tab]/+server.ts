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
  const page = Number(url.searchParams.get("page") ?? "0");
  const tab = params.tab;
  const cleanUsername = decodeURIComponent(params.username).replace(/^@/, "");

  try {
    const user = await getUser(apiClient(event), cleanUsername);
    if (tab === "likes") {
      const feed = await getLikedPosts(apiClient(event), user.id, page);
      return json(feed?.items ?? []);
    } else if (tab === "followers") {
      const userPage = await getFollowers(apiClient(event), user.id, page);
      return json(userPage?.items ?? []);
    } else if (tab === "following") {
      const userPage = await getFollowing(apiClient(event), user.id, page);
      return json(userPage?.items ?? []);
    }
    return json([]);
  } catch (e) {
    return json([]);
  }
};
