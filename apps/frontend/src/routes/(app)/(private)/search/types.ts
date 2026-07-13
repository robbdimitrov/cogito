import type { Post } from "$lib/domains/posts/model";
import type { User } from "$lib/domains/users/model";
import type { Hashtag } from "$lib/domains/posts/api.server";

export type BlendedItem =
  | { type: "users"; item: User }
  | { type: "posts"; item: Post }
  | { type: "hashtags"; item: Hashtag };

export function wrapBlended<K extends "users" | "hashtags">(
  type: K,
  items: Extract<BlendedItem, { type: K }>["item"][],
): BlendedItem[] {
  return items.map((item) => ({ type, item }) as BlendedItem);
}
