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

import { load, actions } from "./+page.server";

type LoadEvent = Parameters<typeof load>[0];
type ActionEvent = Parameters<NonNullable<typeof actions.markRead>>[0];

function loadEvent(): LoadEvent {
  return {
    parent: () => Promise.resolve({}),
    cookies: {},
    fetch: vi.fn(),
  } as unknown as LoadEvent;
}

function markReadEvent(ids: string[]): ActionEvent {
  const formData = new FormData();
  for (const id of ids) formData.append("id", id);
  return {
    request: new Request("http://localhost/notifications?/markRead", {
      method: "POST",
      body: formData,
    }),
    cookies: {},
    fetch: vi.fn(),
  } as unknown as ActionEvent;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notifications page load", () => {
  it("returns notifications without marking any as read", async () => {
    const page = {
      items: [
        { id: 1, read: false },
        { id: 2, read: true },
      ],
      nextCursor: "cursor-1",
    };
    getNotifications.mockResolvedValue(page);

    await expect(load(loadEvent())).resolves.toEqual({
      notifications: page.items,
      nextCursor: page.nextCursor,
    });

    expect(markNotificationRead).not.toHaveBeenCalled();
  });
});

describe("markRead action", () => {
  it("marks exactly the given ids as read, without re-fetching notifications", async () => {
    markNotificationRead.mockResolvedValue(undefined);

    await actions.markRead!(markReadEvent(["1", "3"]));
    await new Promise((resolve) => setImmediate(resolve));

    expect(getNotifications).not.toHaveBeenCalled();
    expect(markNotificationRead).toHaveBeenCalledTimes(2);
    expect(markNotificationRead).toHaveBeenCalledWith(apiCall, "1");
    expect(markNotificationRead).toHaveBeenCalledWith(apiCall, "3");
  });
});
