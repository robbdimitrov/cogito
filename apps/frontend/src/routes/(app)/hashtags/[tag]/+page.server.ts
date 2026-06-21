import { fail } from "@sveltejs/kit";
import {
  getHashtagPosts,
  like,
  unlike,
  repost,
  removeRepost,
  deletePost,
} from "$lib/domains/posts/api.server";
import type { Post } from "$lib/shared/types";

export const load = async ({ fetch, params }) => {
  let posts: Post[] = [];
  try {
    const feed = await getHashtagPosts(fetch, params.tag, 0);
    posts = feed?.items ?? [];
  } catch (e) {
    // ignore
  }
  return { posts, tag: params.tag };
};

export const actions = {
  toggleLike: async ({ request, fetch }) => {
    const data = await request.formData();
    const postId = data.get("postId")?.toString();
    const isLiked = data.get("liked") === "true";
    if (!postId) return fail(400, { error: "Missing postId" });

    try {
      if (isLiked) {
        await unlike(fetch, postId);
      } else {
        await like(fetch, postId);
      }
      return { success: true };
    } catch (e) {
      return fail(500, { error: "Action failed" });
    }
  },
  toggleRepost: async ({ request, fetch }) => {
    const data = await request.formData();
    const postId = data.get("postId")?.toString();
    const isReposted = data.get("reposted") === "true";
    if (!postId) return fail(400, { error: "Missing postId" });

    try {
      if (isReposted) {
        await removeRepost(fetch, postId);
      } else {
        await repost(fetch, postId);
      }
      return { success: true };
    } catch (e) {
      return fail(500, { error: "Action failed" });
    }
  },
  deletePost: async ({ request, fetch }) => {
    const data = await request.formData();
    const postId = data.get("postId")?.toString();
    if (!postId) return fail(400, { error: "Missing postId" });

    try {
      await deletePost(fetch, postId);
      return { success: true };
    } catch (e) {
      return fail(500, { error: "Delete failed" });
    }
  },
};
