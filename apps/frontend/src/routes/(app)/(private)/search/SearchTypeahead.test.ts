import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushSync } from "svelte";
import { mountComponent } from "$lib/shared/testing/mountComponent";
import SearchTypeahead from "./SearchTypeahead.svelte";
import type { BlendedItem } from "./types";

const { gotoMock } = vi.hoisted(() => ({ gotoMock: vi.fn() }));
vi.mock("$app/navigation", () => ({ goto: gotoMock }));

const items: BlendedItem[] = [
  {
    type: "users",
    item: {
      id: 1,
      name: "Alice",
      username: "alice",
      email: "a@example.com",
      posts: 0,
      following: 0,
      followers: 0,
      likes: 0,
    },
  },
  { type: "hashtags", item: { id: 1, name: "svelte", postCount: 3 } },
];

function typeQuery(el: HTMLDivElement, value: string) {
  const input = el.querySelector("input") as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("SearchTypeahead", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    gotoMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not fetch or open the dropdown for an empty query", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const el = mountComponent(SearchTypeahead, { query: "" });

    typeQuery(el, "   ");
    await vi.advanceTimersByTimeAsync(300);
    flushSync();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(el.querySelector("ul")).toBeNull();
  });

  it("debounces the fetch and renders blended suggestions", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ items }) });
    vi.stubGlobal("fetch", fetchMock);
    const el = mountComponent(SearchTypeahead, { query: "" });

    typeQuery(el, "al");
    await vi.advanceTimersByTimeAsync(100);
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);
    flushSync();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.at(0)?.[0]).toContain("type=all");
    expect(el.querySelectorAll("li").length).toBe(2);
  });

  it("navigates to the active suggestion on Enter", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ items }) });
    vi.stubGlobal("fetch", fetchMock);
    const el = mountComponent(SearchTypeahead, { query: "" });

    typeQuery(el, "al");
    await vi.advanceTimersByTimeAsync(300);
    flushSync();

    const input = el.querySelector("input") as HTMLInputElement;
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    flushSync();

    expect(gotoMock).toHaveBeenCalledWith("/@alice");
  });

  it("closes the dropdown if a later fetch fails, instead of leaving stale suggestions open", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const el = mountComponent(SearchTypeahead, { query: "" });

    typeQuery(el, "al");
    await vi.advanceTimersByTimeAsync(300);
    flushSync();
    expect(el.querySelector("ul")).not.toBeNull();

    typeQuery(el, "als");
    await vi.advanceTimersByTimeAsync(300);
    flushSync();

    expect(el.querySelector("ul")).toBeNull();
  });

  it("closes the dropdown on Escape", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ items }) });
    vi.stubGlobal("fetch", fetchMock);
    const el = mountComponent(SearchTypeahead, { query: "" });

    typeQuery(el, "al");
    await vi.advanceTimersByTimeAsync(300);
    flushSync();
    expect(el.querySelector("ul")).not.toBeNull();

    const input = el.querySelector("input") as HTMLInputElement;
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    flushSync();

    expect(el.querySelector("ul")).toBeNull();
  });
});
