import { fail, isHttpError } from "@sveltejs/kit";
import {
  getHashtagPosts,
  like,
  unlike,
  repost,
  removeRepost,
  deletePost,
} from "$lib/domains/posts/api.server";
import { errorMessage } from "$lib/server/api/http";
import { apiClient } from "$lib/server/api/client";
import type { Post } from "$lib/shared/types";

export const load = async (event) => {
  const { params } = event;
  let posts = { items: [] as Post[], nextCursor: null as string | null };
  try {
    const feed = await getHashtagPosts(apiClient(event), params.tag, "");
    posts = { items: feed?.items ?? [], nextCursor: feed?.nextCursor ?? null };
  } catch (e) {
    console.error("Failed to load hashtag posts:", e);
  }
  return { posts, tag: params.tag };
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
};
