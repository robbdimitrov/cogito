import { getHashtagPosts } from "$lib/domains/posts/api.server";
import {
  toggleLike,
  toggleRepost,
  deletePost,
} from "$lib/domains/posts/actions.server";
import { apiClient } from "$lib/server/api/client";
import type { Post } from "$lib/shared/types";

export const load = async (event) => {
  await event.parent();
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
  toggleLike,
  toggleRepost,
  deletePost,
};
