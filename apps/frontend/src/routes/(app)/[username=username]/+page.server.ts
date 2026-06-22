import { fail } from "@sveltejs/kit";
import {
  getUserPosts,
  like,
  unlike,
  repost,
  removeRepost,
  deletePost,
} from "$lib/domains/posts/api.server";
import type { Post } from "$lib/shared/types";
import { follow, unfollow } from "$lib/domains/users/api.server";
import { apiClient } from "$lib/server/api/client";

export const load = async (event) => {
  const { parent } = event;
  const { profileUser } = await parent();
  let posts = { items: [] as Post[], nextCursor: null as string | null };
  try {
    const feed = await getUserPosts(apiClient(event), profileUser.id, "");
    posts = { items: feed?.items ?? [], nextCursor: feed?.nextCursor ?? null };
  } catch (e) {
    // Ignore
  }
  return { posts };
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
      return fail(500, { error: "Action failed" });
    }
  },
};
