import type { Post } from "$lib/domains/posts/model";
import type { User } from "$lib/domains/users/model";
import type { Hashtag } from "$lib/domains/posts/api.server";

export type BlendedItem =
  | { type: "users"; item: User }
  | { type: "posts"; item: Post }
  | { type: "hashtags"; item: Hashtag };

export type SuggestionItem = Extract<
  BlendedItem,
  { type: "users" | "hashtags" }
>;

export type RecentSearchItem =
  | { id: string; type: "users"; item: User }
  | { id: string; type: "hashtags"; item: Hashtag }
  | { id: string; type: "queries"; item: string };

export function wrapBlended<K extends "users" | "hashtags">(
  type: K,
  items: Extract<BlendedItem, { type: K }>["item"][],
): BlendedItem[] {
  return items.map((item) => ({ type, item }) as BlendedItem);
}

export function interleaveSuggestions(
  users: Extract<SuggestionItem, { type: "users" }>["item"][],
  hashtags: Extract<SuggestionItem, { type: "hashtags" }>["item"][],
  limit: number,
): SuggestionItem[] {
  const items: SuggestionItem[] = [];
  let userIndex = 0;
  let hashtagIndex = 0;
  while (
    items.length < limit &&
    (userIndex < users.length || hashtagIndex < hashtags.length)
  ) {
    const user = users[userIndex];
    if (user) {
      items.push({ type: "users", item: user });
      userIndex += 1;
    }
    const hashtag = hashtags[hashtagIndex];
    if (items.length < limit && hashtag) {
      items.push({ type: "hashtags", item: hashtag });
      hashtagIndex += 1;
    }
  }
  return items;
}
