import { describe, it, expect } from "vitest";
import { mountComponent } from "$lib/shared/testing/mountComponent";
import { TOAST_CONTEXT, type ToastController } from "$lib/shared/toast.svelte";
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

const stubToastController: ToastController = {
  items: [],
  success: () => {},
  error: () => {},
  info: () => {},
  remove: () => {},
};
const toastContext = new Map([[TOAST_CONTEXT, stubToastController]]);

describe("UserHeader anonymous gating", () => {
  it("renders a login link instead of the follow form when currentUser is null", () => {
    const el = mountComponent(
      UserHeader,
      { user, currentUser: null },
      toastContext,
    );

    expect(el.querySelector('a[href="/login"]')).not.toBeNull();
    expect(el.querySelector('form[action*="?/toggleFollow"]')).toBeNull();
  });

  it("renders the follow form when currentUser is a different user", () => {
    const el = mountComponent(
      UserHeader,
      { user, currentUser: { ...user, id: 2, username: "bob" } },
      toastContext,
    );

    expect(el.querySelector('form[action*="?/toggleFollow"]')).not.toBeNull();
  });

  it("renders a settings link when viewing your own profile", () => {
    const el = mountComponent(
      UserHeader,
      { user, currentUser: user },
      toastContext,
    );

    expect(el.querySelector('a[href="/settings"]')).not.toBeNull();
    expect(el.querySelector('form[action*="?/toggleFollow"]')).toBeNull();
  });
});
