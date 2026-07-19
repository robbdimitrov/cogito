import { describe, it, expect, vi, afterEach } from "vitest";
import { mount, unmount, flushSync } from "svelte";
import RepostMenu from "./RepostMenu.svelte";

const { env } = vi.hoisted(() => ({ env: { browser: true } }));
vi.mock("$app/environment", () => ({
  get browser() {
    return env.browser;
  },
}));

function noop() {}

// jsdom has no Web Animations API; finish every transition synchronously.
Element.prototype.animate = function () {
  return {
    cancel: noop,
    currentTime: 0,
    playState: "finished",
    effect: null,
    set onfinish(fn: (() => void) | null) {
      fn?.();
    },
  } as unknown as Animation;
};

const props = {
  reposted: false,
  reposts: 0,
  isReposting: false,
  onRepost: noop,
  onQuote: noop,
};

describe("RepostMenu", () => {
  afterEach(() => {
    env.browser = true;
    vi.restoreAllMocks();
  });

  it("does not touch document listeners on teardown when browser is false (SSR)", async () => {
    env.browser = false;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const instance = mount(RepostMenu, { target: container, props });
    flushSync();

    // "click" is also removed by Svelte's own delegated-event cleanup, so
    // only "keydown" removal is specific to this component's onDestroy guard.
    const removeSpy = vi.spyOn(document, "removeEventListener");
    await expect(unmount(instance)).resolves.not.toThrow();
    expect(removeSpy.mock.calls.some(([type]) => type === "keydown")).toBe(
      false,
    );

    container.remove();
  });

  it("opens on trigger click and closes on an outside document click", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const instance = mount(RepostMenu, { target: container, props });
    flushSync();

    const trigger = container.querySelector("button") as HTMLButtonElement;
    trigger.click();
    flushSync();
    expect(container.querySelector('[role="group"]')).not.toBeNull();

    document.body.click();
    flushSync();
    expect(container.querySelector('[role="group"]')).toBeNull();

    unmount(instance);
    container.remove();
  });
});
