import type { PageServerLoad } from "./$types";
import { apiClient } from "$lib/server/api/client";
import type { Post } from "$lib/domains/posts/model";
import type { User } from "$lib/domains/users/model";
import type { Hashtag } from "$lib/domains/posts/api.server";

export const load: PageServerLoad = async (event) => {
  const q = event.url.searchParams.get("q") ?? "";
  const tab = event.url.searchParams.get("tab") ?? "posts";
  const api = apiClient(event);

  let posts: Post[] = [];
  let users: User[] = [];
  let hashtags: Hashtag[] = [];

  if (q) {
    try {
      const typeMap: Record<string, string> = { posts: "posts", users: "users", hashtags: "hashtags" };
      const type = typeMap[tab] ?? "posts";
      const res = await api(`/search?q=${encodeURIComponent(q)}&type=${type}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (tab === "posts") posts = data.items ?? [];
        else if (tab === "users") users = data.items ?? [];
        else if (tab === "hashtags") hashtags = data.items ?? [];
      }
    } catch {
      // fall through with empty results
    }
  }

  return { q, tab, posts, users, hashtags };
};
