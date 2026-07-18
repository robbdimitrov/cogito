import { fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { apiClient } from "$lib/server/api/client";
import { failFromError, unwrap } from "$lib/server/api/http";
import type { User } from "$lib/domains/users/model";
import { getHashtagPosts, type PostPage } from "$lib/domains/posts/api.server";
import {
  toggleLike,
  toggleRepost,
  deletePost,
} from "$lib/domains/posts/actions.server";
import { wrapBlended, type BlendedItem, type RecentSearchItem } from "./types";

const SEARCH_PREVIEW_LIMIT = 15;
const EMPTY_SECTION = { items: [], nextCursor: null };
type SearchType = "all" | "users";
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

async function listRecentSearches(
  api: ReturnType<typeof apiClient>,
): Promise<RecentSearchItem[]> {
  try {
    const res = await api("/search/recent");
    return (await unwrap<RecentSearchItem[]>(res)) ?? [];
  } catch {
    return [];
  }
}

export const load: PageServerLoad = async (event) => {
  await event.parent();
  const q = event.url.searchParams.get("q") ?? "";
  const api = apiClient(event);
  const recentPromise = listRecentSearches(api);

  if (!q) {
    return {
      q,
      type: "all" as const,
      results: EMPTY_SECTION as SearchSection<BlendedItem>,
      recent: await recentPromise,
    };
  }

  // An explicit @/# prefix means the user picked a specific entity type, so
  // show only the matching section instead of a blended list.
  if (q.startsWith("@")) {
    const [section, recent] = await Promise.all([
      searchSection<User>(api, q.replace(/^@/, ""), "users"),
      recentPromise,
    ]);
    return {
      q,
      type: "users" as const,
      results: {
        items: wrapBlended("users", section.items),
        nextCursor: section.nextCursor,
      },
      recent,
    };
  }
  if (q.startsWith("#")) {
    const tag = q.replace(/^#/, "");
    const [posts, recent] = await Promise.all([
      getHashtagPosts(api, tag).catch<PostPage>(() => ({
        items: [],
        nextCursor: null,
      })),
      recentPromise,
    ]);
    return { q, type: "hashtag-posts" as const, tag, results: posts, recent };
  }

  const [results, recent] = await Promise.all([
    searchSection<BlendedItem>(api, q, "all"),
    recentPromise,
  ]);
  return { q, type: "all" as const, results, recent };
};

export const actions: Actions = {
  toggleLike,
  toggleRepost,
  deletePost,
  removeRecent: async (event) => {
    const formData = await event.request.formData();
    const id = formData.get("id");
    if (typeof id !== "string" || !id) {
      return fail(400, { error: "Recent search ID is required." });
    }
    try {
      await unwrap<null>(
        await apiClient(event)(`/search/recent/${encodeURIComponent(id)}`, {
          method: "DELETE",
        }),
      );
      return { success: true };
    } catch (e) {
      return failFromError(e, "Could not remove recent search.");
    }
  },
  clearRecent: async (event) => {
    try {
      await unwrap<null>(
        await apiClient(event)("/search/recent", { method: "DELETE" }),
      );
      return { success: true };
    } catch (e) {
      return failFromError(e, "Could not clear recent searches.");
    }
  },
};
