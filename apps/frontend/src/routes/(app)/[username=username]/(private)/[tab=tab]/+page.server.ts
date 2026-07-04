import { fail, error, redirect } from "@sveltejs/kit";
import { getLikedPosts } from "$lib/domains/posts/api.server";
import {
  toggleLike,
  toggleRepost,
  deletePost,
} from "$lib/domains/posts/actions.server";
import {
  getFollowers,
  getFollowing,
  follow,
  unfollow,
} from "$lib/domains/users/api.server";
import { apiClient } from "$lib/server/api/client";
import { failFromError } from "$lib/server/api/http";

export const load = async (event) => {
  const { params, parent } = event;
  const { currentUser, profileUser } = await parent();
  if (!currentUser) redirect(303, "/login");

  const tab = params.tab;

  if (tab !== "likes" && tab !== "followers" && tab !== "following") {
    throw error(404, "Not found");
  }

  try {
    if (tab === "likes") {
      const feed = await getLikedPosts(apiClient(event), profileUser.id, "");
      return {
        tab,
        items: feed?.items ?? [],
        nextCursor: feed?.nextCursor ?? null,
        type: "posts",
      };
    } else if (tab === "followers") {
      const userPage = await getFollowers(apiClient(event), profileUser.id, "");
      return {
        tab,
        items: userPage?.items ?? [],
        nextCursor: userPage?.nextCursor ?? null,
        type: "users",
      };
    } else {
      const userPage = await getFollowing(apiClient(event), profileUser.id, "");
      return {
        tab,
        items: userPage?.items ?? [],
        nextCursor: userPage?.nextCursor ?? null,
        type: "users",
      };
    }
  } catch (e) {
    console.error("Failed to load tab data:", e);
    return {
      tab,
      items: [],
      nextCursor: null,
      type: tab === "likes" ? "posts" : "users",
    };
  }
};

export const actions = {
  toggleLike,
  toggleRepost,
  deletePost,
  toggleFollow: async (event) => {
    const { request } = event;
    const data = await request.formData();
    const userId = data.get("userId")?.toString();
    const action = data.get("action")?.toString();
    const isFollowed = action === "unfollow";
    if (!userId) return fail(400, { error: "Missing userId" });

    try {
      if (isFollowed) {
        await unfollow(apiClient(event), userId);
      } else {
        await follow(apiClient(event), userId);
      }
      return { success: true };
    } catch (e) {
      return failFromError(e, "Action failed");
    }
  },
};
