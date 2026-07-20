import { describe, it, expect, vi } from "vitest";
import { mountComponent } from "$lib/shared/testing/mountComponent";
import Navbar from "./Navbar.svelte";

const { pageState } = vi.hoisted(() => ({
  pageState: { url: new URL("http://localhost/") },
}));
vi.mock("$app/state", () => ({ page: pageState }));

describe("Navbar notifications link", () => {
  it("disables preload so hovering the bell can't trigger the mark-read load", () => {
    const el = mountComponent(Navbar, {
      user: {
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
    });

    const bellLink = el.querySelector('a[href="/notifications"]');
    expect(bellLink?.getAttribute("data-sveltekit-preload-data")).toBe("off");
  });
});
