import { fail } from "@sveltejs/kit";
import {
  getPost,
  getReplies,
  like,
  unlike,
  repost,
  removeRepost,
  deletePost,
  create,
} from "$lib/domains/posts/api.server";
import { apiClient } from "$lib/server/api/client";

export const load = async (event) => {
  const { params } = event;
  const [post, repliesData] = await Promise.all([
    getPost(apiClient(event), params.id).catch(() => null),
    getReplies(apiClient(event), params.id, 0).catch(() => null),
  ]);

  return {
    post,
    replies: repliesData?.items ?? [],
  };
};

export const actions = {
  createReply: async (event) => {
    const { request, params } = event;
    const data = await request.formData();
    const content = data.get("content")?.toString() || "";

    if (!content.trim()) {
      return fail(400, { error: "Reply cannot be empty" });
    }

    try {
      await create(apiClient(event), {
        content: content.trim(),
        inReplyToId: params.id,
      });
      return { success: true };
    } catch (e) {
      return fail(500, { error: "Failed to post reply" });
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
};
