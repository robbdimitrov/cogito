import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushSync } from "svelte";
import { mountComponent } from "$lib/shared/testing/mountComponent";
import SearchTypeahead from "./SearchTypeahead.svelte";
import type { RecentSearchItem } from "./types";

const { gotoMock, recordRecentSearchMock } = vi.hoisted(() => ({
  gotoMock: vi.fn(),
  recordRecentSearchMock: vi.fn(),
}));
vi.mock("$app/navigation", () => ({ goto: gotoMock }));
vi.mock("$lib/shared/recentSearch", () => ({
  recordRecentSearch: recordRecentSearchMock,
}));

const user = {
  id: 1,
  name: "Alice",
  username: "alice",
  email: "a@example.com",
  posts: 0,
  following: 0,
  followers: 0,
  likes: 0,
};
const hashtag = { id: 1, name: "svelte", postCount: 3 };
const users = [user];
const hashtags = [hashtag];
const recent: RecentSearchItem[] = [
  {
    id: "01904d2e-7f4d-7c33-ae21-2f94737eaa10",
    type: "queries",
    item: "live flow",
  },
];
const removableRecent: RecentSearchItem[] = [
  ...recent,
  {
    id: "01904d2e-7f4d-7c33-ae21-2f94737eaa11",
    type: "queries",
    item: "second",
  },
];

function suggestionFetch(ok = true) {
  return vi.fn((url: string) => {
    if (!ok) return Promise.resolve({ ok: false, json: async () => ({}) });
    const items = url.includes("type=users") ? users : hashtags;
    return Promise.resolve({ ok: true, json: async () => ({ items }) });
  });
}

function typeQuery(el: HTMLDivElement, value: string) {
  const input = el.querySelector("input") as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("SearchTypeahead", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    gotoMock.mockClear();
    recordRecentSearchMock.mockClear();
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

  it("debounces the fetch and renders user and hashtag suggestions", async () => {
    const fetchMock = suggestionFetch();
    vi.stubGlobal("fetch", fetchMock);
    const el = mountComponent(SearchTypeahead, { query: "" });

    typeQuery(el, "al");
    await vi.advanceTimersByTimeAsync(100);
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);
    flushSync();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.at(0)?.[0]).toContain("type=users");
    expect(fetchMock.mock.calls.at(1)?.[0]).toContain("type=hashtags");
    expect(el.querySelectorAll("li").length).toBe(2);
  });

  it("caps the combined suggestion list at 10", async () => {
    const manyUsers = Array.from({ length: 10 }, (_, i) => ({
      ...user,
      id: i + 1,
      username: `alice${i}`,
    }));
    const manyTags = Array.from({ length: 10 }, (_, i) => ({
      ...hashtag,
      id: i + 1,
      name: `tag${i}`,
    }));
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          items: url.includes("type=users") ? manyUsers : manyTags,
        }),
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const el = mountComponent(SearchTypeahead, { query: "" });

    typeQuery(el, "a");
    await vi.advanceTimersByTimeAsync(300);
    flushSync();

    expect(el.querySelectorAll("li").length).toBe(10);
  });

  it("navigates to the active suggestion on Enter", async () => {
    const fetchMock = suggestionFetch();
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
    expect(recordRecentSearchMock).toHaveBeenCalledWith("users", "alice");
  });

  it("does not navigate a suggestion on Enter before arrow navigation", async () => {
    const fetchMock = suggestionFetch();
    vi.stubGlobal("fetch", fetchMock);
    const el = mountComponent(SearchTypeahead, { query: "" });

    typeQuery(el, "al");
    await vi.advanceTimersByTimeAsync(300);
    flushSync();

    const input = el.querySelector("input") as HTMLInputElement;
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    flushSync();

    expect(gotoMock).not.toHaveBeenCalled();
  });

  it("closes the dropdown if a later fetch fails, instead of leaving stale suggestions open", async () => {
    const fetchMock = vi
      .fn((url: string) =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            items: url.includes("type=users") ? users : hashtags,
          }),
        }),
      )
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: users }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: hashtags }),
      })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ items: [] }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ items: [] }) });
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
    const fetchMock = suggestionFetch();
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

  it("shows recent searches when the empty input is focused", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const el = mountComponent(SearchTypeahead, { query: "", recent });

    const input = el.querySelector("input") as HTMLInputElement;
    input.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    flushSync();

    expect(el.textContent).toContain("Recent");
    expect(el.textContent).toContain("live flow");
  });

  it("closes recent searches on Escape", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const el = mountComponent(SearchTypeahead, { query: "", recent });

    const input = el.querySelector("input") as HTMLInputElement;
    input.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    flushSync();
    expect(el.textContent).toContain("live flow");

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    flushSync();

    expect(el.textContent).not.toContain("live flow");
  });

  it("restores a removed recent search when delete fetch rejects", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    const el = mountComponent(SearchTypeahead, {
      query: "",
      recent: removableRecent,
    });

    const input = el.querySelector("input") as HTMLInputElement;
    input.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    flushSync();

    const removeButton = el.querySelector(
      'button[aria-label="Remove from recent searches"]',
    ) as HTMLButtonElement;
    removeButton.click();

    await vi.waitFor(() => {
      flushSync();
      expect(el.textContent).toContain("live flow");
    });
  });

  it("restores recent searches when clear fetch rejects", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    const el = mountComponent(SearchTypeahead, {
      query: "",
      recent: removableRecent,
    });

    const input = el.querySelector("input") as HTMLInputElement;
    input.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    flushSync();

    const clearButton = Array.from(el.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Clear all"),
    ) as HTMLButtonElement;
    clearButton.click();

    await vi.waitFor(() => {
      flushSync();
      expect(el.textContent).toContain("live flow");
      expect(el.textContent).toContain("second");
    });
  });
});
