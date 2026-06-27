import { getUserById } from "$lib/domains/users/api.server";
import type { User } from "$lib/domains/users/model";
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
  const notifications = await attachActors(api, page.notifications);
  const markedRead =
    options.markRead === false
      ? new Set<number>()
      : await markUnreadAsRead(api, notifications);

  return {
    items: notifications.map((notification) =>
      markedRead.has(notification.id)
        ? { ...notification, read: true }
        : notification,
    ),
    nextCursor: page.nextCursor,
  };
}

async function attachActors(
  api: ApiClient,
  notifications: Notification[],
): Promise<Notification[]> {
  const actorIDs = [...new Set(notifications.map((item) => item.actorId))];
  const actors = await Promise.allSettled(
    actorIDs.map(
      async (actorID): Promise<[number, User]> => [
        actorID,
        await getUserById(api, String(actorID)),
      ],
    ),
  );
  const actorByID = new Map<number, User>();
  for (const result of actors) {
    if (result.status === "fulfilled") {
      actorByID.set(result.value[0], result.value[1]);
    }
  }

  return notifications.map((notification) => ({
    ...notification,
    actor: actorByID.get(notification.actorId),
  }));
}

async function markUnreadAsRead(
  api: ApiClient,
  notifications: Notification[],
): Promise<Set<number>> {
  const unread = notifications.filter((notification) => !notification.read);
  const results = await Promise.allSettled(
    unread.map((notification) => markNotificationRead(api, notification.id)),
  );
  const marked = new Set<number>();
  for (const [index, result] of results.entries()) {
    const notification = unread[index];
    if (notification && result.status === "fulfilled") {
      marked.add(notification.id);
    }
  }
  return marked;
}
