import { fail } from "@sveltejs/kit";
import { getPost, getReplies, create } from "$lib/domains/posts/api.server";
import {
  toggleLike,
  toggleRepost,
  deletePost,
} from "$lib/domains/posts/actions.server";
import { apiClient } from "$lib/server/api/client";
import { failFromError } from "$lib/server/api/http";

export const load = async (event) => {
  const { params } = event;
  // getPost doesn't need currentUser, so it must not wait on the parent
  // layout's session resolution — only the replies fetch is conditional on
  // being logged in, and that gating happens after parent() resolves, in
  // parallel with getPost rather than blocking it.
  const postPromise = getPost(apiClient(event), params.id).catch(() => null);
  const repliesPromise = event
    .parent()
    .then(({ currentUser }) =>
      currentUser
        ? getReplies(apiClient(event), params.id, "").catch(() => null)
        : null,
    );

  const [post, repliesData] = await Promise.all([postPromise, repliesPromise]);

  return {
    post,
    replies: {
      items: repliesData?.items ?? [],
      nextCursor: repliesData?.nextCursor ?? null,
    },
  };
};

export const actions = {
  reply: async (event) => {
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
  quote: async (event) => {
    const { request } = event;
    const data = await request.formData();
    const content = data.get("content")?.toString() || "";
    const quoteOfId = data.get("quotePostId")?.toString();

    if (!content.trim()) {
      return fail(400, { error: "Quote cannot be empty" });
    }

    if (!quoteOfId) {
      return fail(400, { error: "Missing quoted post" });
    }

    try {
      await create(apiClient(event), {
        content: content.trim(),
        quoteOfId,
      });
      return { success: true };
    } catch (e) {
      return failFromError(e, "Failed to post quote");
    }
  },
  toggleLike,
  toggleRepost,
  deletePost,
};
