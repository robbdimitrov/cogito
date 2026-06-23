import type { ApiClient } from "$lib/server/api/client";
import { unwrap } from "$lib/server/api/http";
import type { Notification } from "./model";

const DEFAULT_PAGE_SIZE = 20;

export interface NotificationPage {
  notifications: Notification[];
  nextCursor: string | null;
}

interface UnreadCount {
  count: number;
}

export async function getNotifications(
  api: ApiClient,
  cursor = "",
  limit = DEFAULT_PAGE_SIZE,
): Promise<NotificationPage> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);

  const res = await api(`/notifications?${query}`);
  const unwrapped = await unwrap<NotificationPage>(res);
  return unwrapped ?? { notifications: [], nextCursor: null };
}

export async function markNotificationRead(
  api: ApiClient,
  notificationID: string | number,
): Promise<void> {
  const res = await api(`/notifications/${notificationID}/read`, {
    method: "PUT",
  });
  await unwrap<null>(res);
}

export async function getUnreadCount(api: ApiClient): Promise<number> {
  const res = await api("/notifications/unread-count");
  const unwrapped = await unwrap<UnreadCount>(res);
  return unwrapped?.count ?? 0;
}
