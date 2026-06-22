import type { PageServerLoad } from "./$types";
import { searchHashtags, getHashtagPosts, type Hashtag } from "$lib/domains/posts/api.server";
import { searchUsers } from "$lib/domains/users/api.server";
import type { Post } from "$lib/domains/posts/model";
import type { User } from "$lib/domains/users/model";
import { apiClient } from "$lib/server/api/client";

export const load: PageServerLoad = async (event) => {
  const q = event.url.searchParams.get("q") ?? "";
  const tab = event.url.searchParams.get("tab") ?? "posts";
  const api = apiClient(event);

  let posts: Post[] = [];
  let users: User[] = [];
  let hashtags: Hashtag[] = [];

  if (q) {
    try {
      if (tab === "posts") {
        const tag = q.startsWith("#") ? q.slice(1) : null;
        if (tag) {
          const res = await getHashtagPosts(api, tag, 0);
          posts = res.items;
        }
      } else if (tab === "users") {
        const res = await searchUsers(api, q, 20);
        users = res.items;
      } else if (tab === "hashtags") {
        const res = await searchHashtags(api, q, 20);
        hashtags = res.items;
      }
    } catch {
      // fall through with empty results
    }
  }

  return { q, tab, posts, users, hashtags };
};
