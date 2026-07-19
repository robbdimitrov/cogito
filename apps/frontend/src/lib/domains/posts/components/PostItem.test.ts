import { describe, it, expect } from "vitest";
import { mountComponent } from "$lib/shared/testing/mountComponent";
import PostItem from "./PostItem.svelte";
import type { Post } from "$lib/shared/types";

const post: Post = {
  id: 1,
  content: "hello",
  userId: 1,
  created: "2026-01-01T00:00:00Z",
  likes: 3,
  reposts: 1,
  liked: false,
  reposted: false,
  replies: 0,
};

describe("PostItem anonymous gating", () => {
  it("renders login links instead of like/repost forms when currentUserId is null", () => {
    const el = mountComponent(PostItem, { post, currentUserId: null });

    expect(el.querySelector('a[href="/login"]')).not.toBeNull();
    expect(el.querySelector('form[action*="?/toggleLike"]')).toBeNull();
    expect(el.querySelector('form[action*="?/toggleRepost"]')).toBeNull();
  });

  it("renders like/repost forms when currentUserId is set", () => {
    const el = mountComponent(PostItem, { post, currentUserId: 2 });

    expect(el.querySelector('form[action*="?/toggleLike"]')).not.toBeNull();
    expect(el.querySelector('form[action*="?/toggleRepost"]')).not.toBeNull();
  });
});

describe("PostItem reply context", () => {
  it("renders a replying-to line when inReplyToUsername is present", () => {
    const reply: Post = { ...post, inReplyToId: 5, inReplyToUsername: "carol" };
    const el = mountComponent(PostItem, { post: reply, currentUserId: 2 });

    expect(el.textContent).toContain("Replying to");
    expect(el.textContent).toContain("@carol");
  });

  it("omits the replying-to line when inReplyToUsername is absent", () => {
    const el = mountComponent(PostItem, { post, currentUserId: 2 });

    expect(el.textContent).not.toContain("Replying to");
  });
});
