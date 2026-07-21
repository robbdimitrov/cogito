import { describe, it, expect, vi, afterEach } from "vitest";
import { mountComponent } from "$lib/shared/testing/mountComponent";
import type { Notification } from "$lib/domains/notifications/model";
import NotificationsPage from "./+page.svelte";

const notifications: Notification[] = [
  {
    id: 1,
    externalId: 1,
    userId: 1,
    actorId: 2,
    type: "like",
    entityId: "post-1",
    read: false,
    created: "2024-01-01T00:00:00Z",
  },
];

describe("Notifications page mount", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs the unread ids to the same-origin route once the page has actually mounted", () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    mountComponent(NotificationsPage, {
      data: {
        theme: "system",
        currentUser: null,
        sessionUnavailable: false,
        unreadCount: 0,
        notifications,
        nextCursor: null,
      },
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/notifications",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ids: [1] }),
      }),
    );
  });
});
