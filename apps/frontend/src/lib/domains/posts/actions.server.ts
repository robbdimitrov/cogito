import { fail } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import {
  like,
  unlike,
  repost,
  removeRepost,
  deletePost as apiDeletePost,
} from "$lib/domains/posts/api.server";
import { apiClient } from "$lib/server/api/client";
import { failFromError } from "$lib/server/api/http";

export const toggleLike = async (event: RequestEvent) => {
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
    return failFromError(e, "Action failed");
  }
};

export const toggleRepost = async (event: RequestEvent) => {
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
    return failFromError(e, "Action failed");
  }
};

export const deletePost = async (event: RequestEvent) => {
  const { request } = event;
  const data = await request.formData();
  const postId = data.get("postId")?.toString();
  if (!postId) return fail(400, { error: "Missing postId" });

  try {
    await apiDeletePost(apiClient(event), postId);
    return { success: true };
  } catch (e) {
    return failFromError(e, "Delete failed");
  }
};
