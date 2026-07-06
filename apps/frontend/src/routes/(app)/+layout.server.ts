import { resolveCurrentUser } from "$lib/domains/auth/currentUser.server";
import { getUnreadCount } from "$lib/domains/notifications/api.server";
import { apiClient } from "$lib/server/api/client";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
  // Gate unread-count on the cookie to avoid anonymous 401s while keeping the
  // fetch parallel with resolveCurrentUser's backend calls.
  const hasSession = Boolean(event.cookies.get("session"));
  const unreadCountPromise =
    hasSession && event.url.pathname !== "/notifications"
      ? getUnreadCount(apiClient(event)).catch(() => 0)
      : Promise.resolve(0);

  const result = await resolveCurrentUser(apiClient(event));
  const unreadCount =
    result.status === "authenticated" ? await unreadCountPromise : 0;

  return {
    currentUser: result.user,
    sessionUnavailable: result.status === "unavailable",
    unreadCount,
  };
};
