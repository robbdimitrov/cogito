import { fail } from "@sveltejs/kit";
import { getFeed, create } from "$lib/domains/posts/api.server";
import {
  toggleLike,
  toggleRepost,
  deletePost,
} from "$lib/domains/posts/actions.server";
import { uploadImage } from "$lib/domains/posts/uploads.server";
import { apiClient } from "$lib/server/api/client";
import { failFromError } from "$lib/server/api/http";

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
      return failFromError(e, "Failed to post");
    }
  },
  toggleLike,
  toggleRepost,
  deletePost,
};
