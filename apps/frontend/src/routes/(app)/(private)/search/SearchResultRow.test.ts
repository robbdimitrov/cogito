import { describe, it, expect } from "vitest";
import { mountComponent } from "$lib/shared/testing/mountComponent";
import SearchResultRow from "./SearchResultRow.svelte";
import type { BlendedItem } from "./types";

const userResult: BlendedItem = {
  type: "users",
  item: {
    id: 1,
    name: "Alice",
    username: "alice",
    email: "alice@example.com",
    posts: 0,
    replies: 0,
    following: 0,
    followers: 0,
    likes: 0,
  },
};

const hashtagResult: BlendedItem = {
  type: "hashtags",
  item: { id: 1, name: "svelte", postCount: 12 },
};

const postResult: BlendedItem = {
  type: "posts",
  item: {
    publicId: "550e8400-e29b-41d4-a716-446655440000",
    content: "hello world",
    userId: 1,
    created: "2026-01-01T00:00:00Z",
    likes: 0,
    reposts: 0,
    replies: 0,
  },
};

describe("SearchResultRow", () => {
  it("renders a user row with a profile link", () => {
    const el = mountComponent(SearchResultRow, { result: userResult });
    const link = el.querySelector('a[href="/@alice"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("Alice");
  });

  it("renders a hashtag row with a hashtag link and post count", () => {
    const el = mountComponent(SearchResultRow, { result: hashtagResult });
    const link = el.querySelector('a[href="/search?q=%23svelte"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("12");
  });

  it("renders a full post card via PostItem when not compact", () => {
    const el = mountComponent(SearchResultRow, { result: postResult });
    expect(el.querySelector("li")).not.toBeNull();
    expect(el.textContent).toContain("hello world");
  });

  it("renders a compact one-line preview for posts when compact", () => {
    const el = mountComponent(SearchResultRow, {
      result: postResult,
      compact: true,
    });
    const link = el.querySelector(
      'a[href="/posts/550e8400-e29b-41d4-a716-446655440000"]',
    );
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("hello world");
  });
});
