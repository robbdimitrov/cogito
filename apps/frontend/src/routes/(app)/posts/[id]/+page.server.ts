import { fail } from "@sveltejs/kit";
import { getPost, getReplies, create } from "$lib/domains/posts/api.server";
import { toggleLike, toggleRepost, deletePost } from "$lib/domains/posts/actions.server";
import { apiClient } from "$lib/server/api/client";
import { failFromError } from "$lib/server/api/http";

export const load = async (event) => {
  const { params } = event;
  const [post, repliesData] = await Promise.all([
    getPost(apiClient(event), params.id).catch(() => null),
    getReplies(apiClient(event), params.id, "").catch(() => null),
  ]);

  return {
    post,
    replies: {
      items: repliesData?.items ?? [],
      nextCursor: repliesData?.nextCursor ?? null,
    },
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
      return failFromError(e, "Failed to post reply");
    }
  },
  toggleLike,
  toggleRepost,
  deletePost,
};
