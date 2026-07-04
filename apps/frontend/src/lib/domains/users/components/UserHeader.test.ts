import { describe, it, expect } from "vitest";
import { mountComponent } from "$lib/shared/testing/mountComponent";
import UserHeader from "./UserHeader.svelte";
import type { User } from "$lib/shared/types";

const user: User = {
  id: 1,
  name: "Alice",
  username: "alice",
  email: "alice@example.com",
  posts: 0,
  following: 0,
  followers: 0,
  likes: 0,
  followed: false,
};

describe("UserHeader anonymous gating", () => {
  it("renders a login link instead of the follow form when currentUser is null", () => {
    const el = mountComponent(UserHeader, { user, currentUser: null });

    expect(el.querySelector('a[href="/login"]')).not.toBeNull();
    expect(el.querySelector('form[action*="?/toggleFollow"]')).toBeNull();
  });

  it("renders the follow form when currentUser is a different user", () => {
    const el = mountComponent(UserHeader, {
      user,
      currentUser: { ...user, id: 2, username: "bob" },
    });

    expect(el.querySelector('form[action*="?/toggleFollow"]')).not.toBeNull();
  });
});
