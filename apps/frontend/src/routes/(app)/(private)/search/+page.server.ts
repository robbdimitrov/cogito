import type { PageServerLoad } from "./$types";
import { apiClient } from "$lib/server/api/client";
import { unwrap } from "$lib/server/api/http";
import type { Post } from "$lib/domains/posts/model";
import type { User } from "$lib/domains/users/model";
import type { Hashtag } from "$lib/domains/posts/api.server";

const SEARCH_PREVIEW_LIMIT = 5;
const EMPTY_SECTION = { items: [], nextCursor: null };
type SearchType = "posts" | "users" | "hashtags";
type SearchSection<T> = { items: T[]; nextCursor: string | null };

async function searchSection<T>(
  api: ReturnType<typeof apiClient>,
  q: string,
  type: SearchType,
): Promise<SearchSection<T>> {
  try {
    const params = new URLSearchParams({
      q,
      type,
      limit: String(SEARCH_PREVIEW_LIMIT),
    });
    const res = await api(`/search?${params}`);
    return (await unwrap<SearchSection<T>>(res)) ?? EMPTY_SECTION;
  } catch {
    return EMPTY_SECTION;
  }
}

export const load: PageServerLoad = async (event) => {
  const q = event.url.searchParams.get("q") ?? "";
  const api = apiClient(event);

  if (!q) {
    return {
      q,
      posts: EMPTY_SECTION as SearchSection<Post>,
      users: EMPTY_SECTION as SearchSection<User>,
      hashtags: EMPTY_SECTION as SearchSection<Hashtag>,
    };
  }

  const [posts, users, hashtags] = await Promise.all([
    searchSection<Post>(api, q, "posts"),
    searchSection<User>(api, q.replace(/^@/, ""), "users"),
    searchSection<Hashtag>(api, q.replace(/^#/, ""), "hashtags"),
  ]);

  return { q, posts, users, hashtags };
};
