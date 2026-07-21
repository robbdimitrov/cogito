import { describe, expect, it, vi, beforeEach } from "vitest";

const { apiCall, getNotifications, markNotificationRead } = vi.hoisted(() => ({
  apiCall: vi.fn(),
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
}));

vi.mock("$lib/server/api/client", () => ({ apiClient: () => apiCall }));
vi.mock("$lib/domains/notifications/api.server", () => ({
  getNotifications,
  markNotificationRead,
}));

import { GET, POST } from "./+server";

type RequestEventLike = Parameters<typeof POST>[0];

function postEvent(
  ids: unknown,
  session: string | null = "token",
): RequestEventLike {
  return {
    request: new Request("http://localhost/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids }),
    }),
    cookies: { get: (name: string) => (name === "session" ? session : null) },
    fetch: vi.fn(),
  } as unknown as RequestEventLike;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /notifications", () => {
  it("requires a session cookie", async () => {
    const event = {
      cookies: { get: () => null },
      url: new URL("http://localhost/notifications"),
      fetch: vi.fn(),
    } as unknown as Parameters<typeof GET>[0];

    const res = await GET(event);
    expect(res.status).toBe(401);
    expect(getNotifications).not.toHaveBeenCalled();
  });
});

describe("POST /notifications (mark read)", () => {
  it("marks exactly the given ids as read, without re-fetching notifications", async () => {
    markNotificationRead.mockResolvedValue(undefined);

    const res = await POST(postEvent([1, 3]));
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(200);
    expect(getNotifications).not.toHaveBeenCalled();
    expect(markNotificationRead).toHaveBeenCalledTimes(2);
    expect(markNotificationRead).toHaveBeenCalledWith(apiCall, 1);
    expect(markNotificationRead).toHaveBeenCalledWith(apiCall, 3);
  });

  it("caps a request carrying more ids than the backend's own page size", async () => {
    markNotificationRead.mockResolvedValue(undefined);
    const ids = Array.from({ length: 250 }, (_, i) => i);

    await POST(postEvent(ids));
    await new Promise((resolve) => setImmediate(resolve));

    expect(markNotificationRead).toHaveBeenCalledTimes(100);
  });

  it("ignores non-numeric entries in the ids array", async () => {
    markNotificationRead.mockResolvedValue(undefined);

    await POST(postEvent([1, "not-a-number", null, 2]));
    await new Promise((resolve) => setImmediate(resolve));

    expect(markNotificationRead).toHaveBeenCalledTimes(2);
  });

  it("requires a session cookie", async () => {
    const res = await POST(postEvent([1], null));
    expect(res.status).toBe(401);
    expect(markNotificationRead).not.toHaveBeenCalled();
  });
});
