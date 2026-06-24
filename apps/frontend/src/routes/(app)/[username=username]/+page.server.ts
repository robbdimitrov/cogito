import { fail } from "@sveltejs/kit";
import { getUserPosts } from "$lib/domains/posts/api.server";
import { toggleLike, toggleRepost, deletePost } from "$lib/domains/posts/actions.server";
import type { Post } from "$lib/shared/types";
import { follow, unfollow } from "$lib/domains/users/api.server";
import { apiClient } from "$lib/server/api/client";
import { failFromError } from "$lib/server/api/http";

export const load = async (event) => {
  const { parent } = event;
  const { profileUser } = await parent();
  let posts = { items: [] as Post[], nextCursor: null as string | null };
  try {
    const feed = await getUserPosts(apiClient(event), profileUser.id, "");
    posts = { items: feed?.items ?? [], nextCursor: feed?.nextCursor ?? null };
  } catch (e) {
    console.error("Failed to load user posts:", e);
  }
  return { posts };
};

export const actions = {
  toggleLike,
  toggleRepost,
  deletePost,
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
      return failFromError(e, "Action failed");
    }
  },
};
