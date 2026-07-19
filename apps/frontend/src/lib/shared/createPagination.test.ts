import { describe, it, expect, vi } from "vitest";
import { flushSync } from "svelte";
import { mountComponent } from "./testing/mountComponent";
import PaginationHarness from "./testing/PaginationHarness.svelte";

type Page = { items: number[]; nextCursor: string | null };

function itemsText(el: HTMLElement) {
  return el.querySelector('[data-testid="items"]')!.textContent;
}
function doneText(el: HTMLElement) {
  return el.querySelector('[data-testid="done"]')!.textContent;
}
function loadingText(el: HTMLElement) {
  return el.querySelector('[data-testid="loading"]')!.textContent;
}
function clickMore(el: HTMLElement) {
  el.querySelector("button")!.click();
}

function deferred() {
  let resolve!: (page: Page) => void;
  const promise = new Promise<Page>((r) => (resolve = r));
  return { promise, resolve };
}

describe("createPagination", () => {
  it("starts from getInitial's items and is done when nextCursor is null", () => {
    const el = mountComponent(PaginationHarness, {
      initial: { items: [1, 2], nextCursor: null },
      fetchPage: vi.fn(),
    });

    expect(itemsText(el)).toBe("1,2");
    expect(doneText(el)).toBe("true");
  });

  it("is not done when the initial nextCursor is a non-null string", () => {
    const el = mountComponent(PaginationHarness, {
      initial: { items: [1], nextCursor: "c1" },
      fetchPage: vi.fn(),
    });

    expect(doneText(el)).toBe("false");
  });

  it("more() is a no-op when already done", () => {
    const fetchPage = vi.fn();
    const el = mountComponent(PaginationHarness, {
      initial: { items: [1], nextCursor: null },
      fetchPage,
    });

    clickMore(el);
    flushSync();

    expect(fetchPage).not.toHaveBeenCalled();
  });

  it("fetches with the current cursor, appends items after existing ones, updates cursor/done, and toggles loading", async () => {
    const { promise, resolve } = deferred();
    const fetchPage = vi.fn(() => promise);
    const el = mountComponent(PaginationHarness, {
      initial: { items: [1, 2], nextCursor: "c1" },
      fetchPage,
    });

    clickMore(el);
    flushSync();

    expect(fetchPage).toHaveBeenCalledWith("c1");
    expect(loadingText(el)).toBe("true");

    resolve({ items: [3, 4], nextCursor: "c2" });
    await vi.waitFor(() => {
      flushSync();
      expect(loadingText(el)).toBe("false");
    });

    expect(itemsText(el)).toBe("1,2,3,4");
    expect(doneText(el)).toBe("false");
  });

  it("calling more() again while a fetch is in flight does not fire a second fetchPage call", async () => {
    const { promise, resolve } = deferred();
    const fetchPage = vi.fn(() => promise);
    const el = mountComponent(PaginationHarness, {
      initial: { items: [1], nextCursor: "c1" },
      fetchPage,
    });

    clickMore(el);
    flushSync();
    clickMore(el);
    flushSync();

    expect(fetchPage).toHaveBeenCalledTimes(1);

    resolve({ items: [2], nextCursor: null });
    await vi.waitFor(() => {
      flushSync();
      expect(loadingText(el)).toBe("false");
    });
  });
});
