import { describe, expect, it } from "vitest";
import { toggleLike, toggleRepost, deletePost } from "./actions.server";
import type { RequestEvent } from "@sveltejs/kit";

function makeEvent(
  fields: Record<string, string>,
  fetchStatus = 204,
): RequestEvent {
  const formData = new FormData();
  for (const [k, v] of Object.entries(fields)) formData.set(k, v);

  return {
    request: { formData: () => Promise.resolve(formData) },
    fetch: () => Promise.resolve(new Response(null, { status: fetchStatus })),
    cookies: { get: () => undefined },
  } as unknown as RequestEvent;
}

describe("toggleLike", () => {
  it("returns 400 when postId is missing", async () => {
    const result = await toggleLike(makeEvent({ liked: "false" }));
    expect(result).toMatchObject({ status: 400, data: { error: "Missing postId" } });
  });

  it("calls like when liked=false and returns success", async () => {
    let calledPath = "";
    let calledMethod = "";
    const event = {
      request: {
        formData: () =>
          Promise.resolve(
            Object.assign(new FormData(), {
              get: (k: string) => ({ postId: "42", liked: "false" })[k] ?? null,
            }),
          ),
      },
      fetch: (url: URL, init: RequestInit) => {
        calledPath = url.pathname;
        calledMethod = init?.method ?? "GET";
        return Promise.resolve(new Response(null, { status: 204 }));
      },
      cookies: { get: () => undefined },
    } as unknown as RequestEvent;

    const result = await toggleLike(event);
    expect(result).toEqual({ success: true });
    expect(calledPath).toBe("/posts/42/likes");
    expect(calledMethod).toBe("POST");
  });

  it("calls unlike when liked=true and returns success", async () => {
    let calledMethod = "";
    const event = {
      request: {
        formData: () =>
          Promise.resolve(
            Object.assign(new FormData(), {
              get: (k: string) => ({ postId: "42", liked: "true" })[k] ?? null,
            }),
          ),
      },
      fetch: (_url: URL, init: RequestInit) => {
        calledMethod = init?.method ?? "GET";
        return Promise.resolve(new Response(null, { status: 204 }));
      },
      cookies: { get: () => undefined },
    } as unknown as RequestEvent;

    const result = await toggleLike(event);
    expect(result).toEqual({ success: true });
    expect(calledMethod).toBe("DELETE");
  });

  it("returns 400 when liked field is missing", async () => {
    const result = await toggleLike(makeEvent({ postId: "1" }));
    expect(result).toMatchObject({ status: 400, data: { error: "Missing liked" } });
  });

  it("maps HTTP errors from the API to a failure response", async () => {
    const result = await toggleLike(makeEvent({ postId: "1", liked: "false" }, 403));
    expect(result).toMatchObject({ status: 403 });
  });
});

describe("toggleRepost", () => {
  it("returns 400 when postId is missing", async () => {
    const result = await toggleRepost(makeEvent({ reposted: "false" }));
    expect(result).toMatchObject({ status: 400, data: { error: "Missing postId" } });
  });

  it("calls repost when reposted=false", async () => {
    let calledPath = "";
    let calledMethod = "";
    const event = {
      request: {
        formData: () =>
          Promise.resolve(
            Object.assign(new FormData(), {
              get: (k: string) =>
                ({ postId: "7", reposted: "false" })[k] ?? null,
            }),
          ),
      },
      fetch: (url: URL, init: RequestInit) => {
        calledPath = url.pathname;
        calledMethod = init?.method ?? "GET";
        return Promise.resolve(new Response(null, { status: 204 }));
      },
      cookies: { get: () => undefined },
    } as unknown as RequestEvent;

    const result = await toggleRepost(event);
    expect(result).toEqual({ success: true });
    expect(calledPath).toBe("/posts/7/reposts");
    expect(calledMethod).toBe("POST");
  });

  it("calls removeRepost when reposted=true", async () => {
    let calledMethod = "";
    const event = {
      request: {
        formData: () =>
          Promise.resolve(
            Object.assign(new FormData(), {
              get: (k: string) =>
                ({ postId: "7", reposted: "true" })[k] ?? null,
            }),
          ),
      },
      fetch: (_url: URL, init: RequestInit) => {
        calledMethod = init?.method ?? "GET";
        return Promise.resolve(new Response(null, { status: 204 }));
      },
      cookies: { get: () => undefined },
    } as unknown as RequestEvent;

    const result = await toggleRepost(event);
    expect(result).toEqual({ success: true });
    expect(calledMethod).toBe("DELETE");
  });

  it("returns 400 when reposted field is missing", async () => {
    const result = await toggleRepost(makeEvent({ postId: "1" }));
    expect(result).toMatchObject({ status: 400, data: { error: "Missing reposted" } });
  });

  it("maps HTTP errors from the API to a failure response", async () => {
    const result = await toggleRepost(makeEvent({ postId: "1", reposted: "false" }, 403));
    expect(result).toMatchObject({ status: 403 });
  });
});

describe("deletePost", () => {
  it("returns 400 when postId is missing", async () => {
    const result = await deletePost(makeEvent({}));
    expect(result).toMatchObject({ status: 400, data: { error: "Missing postId" } });
  });

  it("deletes the post and returns success", async () => {
    let calledPath = "";
    let calledMethod = "";
    const event = {
      request: {
        formData: () =>
          Promise.resolve(
            Object.assign(new FormData(), {
              get: (k: string) => ({ postId: "99" })[k] ?? null,
            }),
          ),
      },
      fetch: (url: URL, init: RequestInit) => {
        calledPath = url.pathname;
        calledMethod = init?.method ?? "GET";
        return Promise.resolve(new Response(null, { status: 204 }));
      },
      cookies: { get: () => undefined },
    } as unknown as RequestEvent;

    const result = await deletePost(event);
    expect(result).toEqual({ success: true });
    expect(calledPath).toBe("/posts/99");
    expect(calledMethod).toBe("DELETE");
  });

  it("maps HTTP errors from the API to a failure response", async () => {
    const result = await deletePost(makeEvent({ postId: "1" }, 404));
    expect(result).toMatchObject({ status: 404 });
  });
});
