import type { ApiClient } from "$lib/server/api/client";
import {
  getNotifications,
  markNotificationRead,
} from "$lib/domains/notifications/api.server";
import type { Notification } from "./model";

export async function loadNotificationPage(
  api: ApiClient,
  cursor: string,
  options: { markRead?: boolean } = {},
) {
  const page = await getNotifications(api, cursor);
  const notifications = page.items;
  const markedRead =
    options.markRead === false
      ? new Set<number>()
      : markUnreadAsRead(api, notifications);

  return {
    items: notifications.map((notification) =>
      markedRead.has(notification.id)
        ? { ...notification, read: true }
        : notification,
    ),
    nextCursor: page.nextCursor,
  };
}

// Fire-and-forget: mark-read failures are best-effort and must not block the
// page response on N round-trips to flowservice.
function markUnreadAsRead(
  api: ApiClient,
  notifications: Notification[],
): Set<number> {
  const unread = notifications.filter((notification) => !notification.read);
  void Promise.allSettled(
    unread.map((notification) => markNotificationRead(api, notification.id)),
  );
  return new Set(unread.map((notification) => notification.id));
}
