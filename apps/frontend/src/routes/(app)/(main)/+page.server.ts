import { fail, isHttpError } from "@sveltejs/kit";
import {
  getFeed,
  like,
  unlike,
  repost,
  removeRepost,
  deletePost,
  create,
} from "$lib/domains/posts/api.server";
import { uploadImage } from "$lib/domains/posts/uploads.server";
import { apiClient } from "$lib/server/api/client";
import { errorMessage } from "$lib/server/api/http";

export const load = async (event) => {
  const feed = await getFeed(apiClient(event), "");
  const items = feed?.items ?? [];
  return {
    feed: { items, nextCursor: feed?.nextCursor ?? null },
    isEmpty: items.length === 0,
  };
};

export const actions = {
  createPost: async (event) => {
    const { request, fetch } = event;
    const data = await request.formData();
    const content = data.get("content")?.toString() || "";
    const inReplyToId = data.get("inReplyToId")?.toString();
    const quoteOfId = data.get("quoteOfId")?.toString();
    const file = data.get("image") as File | null;

    if (!content.trim() && (!file || file.size === 0)) {
      return fail(400, { error: "Post cannot be empty" });
    }

    try {
      let mediaKey = data.get("mediaKey")?.toString();
      if (!mediaKey && file && file.size > 0) {
        const uploadRes = await uploadImage(fetch, file);
        mediaKey = uploadRes.key;
      }

      await create(apiClient(event), {
        content: content.trim(),
        mediaKey,
        inReplyToId,
        quoteOfId,
      });
      return { success: true };
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: errorMessage(e.status) });
      return fail(500, { error: "Failed to post" });
    }
  },
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
