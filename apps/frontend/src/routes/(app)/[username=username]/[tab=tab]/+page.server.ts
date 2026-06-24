import { fail, error, isHttpError } from "@sveltejs/kit";
import {
  getLikedPosts,
  like,
  unlike,
  repost,
  removeRepost,
  deletePost,
} from "$lib/domains/posts/api.server";
import {
  getFollowers,
  getFollowing,
  follow,
  unfollow,
} from "$lib/domains/users/api.server";
import { apiClient } from "$lib/server/api/client";
import { errorMessage } from "$lib/server/api/http";

export const load = async (event) => {
  const { params, parent } = event;
  const { profileUser } = await parent();
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
  toggleLike: async (event) => {
    const { request } = event;
    const data = await request.formData();
    const postId = data.get("postId")?.toString();
    const isLiked = data.get("liked") === "true";
    if (!postId) return fail(400, { error: "Missing postId" });

    try {
      if (isLiked) {
        await unlike(apiClient(event), postId);
      } else {
        await like(apiClient(event), postId);
      }
      return { success: true };
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: errorMessage(e.status) });
      return fail(500, { error: "Action failed" });
    }
  },
  toggleRepost: async (event) => {
    const { request } = event;
    const data = await request.formData();
    const postId = data.get("postId")?.toString();
    const isReposted = data.get("reposted") === "true";
    if (!postId) return fail(400, { error: "Missing postId" });

    try {
      if (isReposted) {
        await removeRepost(apiClient(event), postId);
      } else {
        await repost(apiClient(event), postId);
      }
      return { success: true };
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: errorMessage(e.status) });
      return fail(500, { error: "Action failed" });
    }
  },
  deletePost: async (event) => {
    const { request } = event;
    const data = await request.formData();
    const postId = data.get("postId")?.toString();
    if (!postId) return fail(400, { error: "Missing postId" });

    try {
      await deletePost(apiClient(event), postId);
      return { success: true };
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: errorMessage(e.status) });
      return fail(500, { error: "Delete failed" });
    }
  },
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
      if (isHttpError(e)) return fail(e.status, { error: errorMessage(e.status) });
      return fail(500, { error: "Action failed" });
    }
  },
};
