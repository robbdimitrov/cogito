import { fail, error } from "@sveltejs/kit";
import {
  getLikedPosts,
  like,
  unlike,
  repost,
  removeRepost,
  deletePost,
} from "$lib/domains/posts/api.server";
import {
  getFollowers,
  getFollowing,
  follow,
  unfollow,
} from "$lib/domains/users/api.server";
import { apiClient } from "$lib/server/api/client";

export const load = async (event) => {
  const { params, parent } = event;
  const { profileUser } = await parent();
  const tab = params.tab;

  try {
    if (tab === "likes") {
      const feed = await getLikedPosts(apiClient(event), profileUser.id, 0);
      return { tab, items: feed?.items ?? [], type: "posts" };
    } else if (tab === "followers") {
      const userPage = await getFollowers(apiClient(event), profileUser.id, 0);
      return { tab, items: userPage?.items ?? [], type: "users" };
    } else if (tab === "following") {
      const userPage = await getFollowing(apiClient(event), profileUser.id, 0);
      return { tab, items: userPage?.items ?? [], type: "users" };
    } else {
      throw error(404, "Not found");
    }
  } catch (e) {
    return { tab, items: [], type: tab === "likes" ? "posts" : "users" };
  }
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
      return fail(500, { error: "Action failed" });
    }
  },
};
