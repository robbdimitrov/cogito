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

import { load } from "./+page.server";

type LoadEvent = Parameters<typeof load>[0];

function loadEvent(): LoadEvent {
  return {
    parent: () => Promise.resolve({}),
    cookies: {},
    fetch: vi.fn(),
  } as unknown as LoadEvent;
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
