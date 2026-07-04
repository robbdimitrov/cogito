import { resolveCurrentUser } from "$lib/domains/auth/currentUser.server";
import { getUnreadCount } from "$lib/domains/notifications/api.server";
import { apiClient } from "$lib/server/api/client";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
  // Anonymous visitors can reach this layout now (posts/[id], profiles), so
  // the unread-count fetch must not fire without a session cookie — it's a
  // guaranteed-401 call otherwise. Gate on the cookie itself (like sibling
  // +server.ts files do) rather than on the fully-resolved session, so this
  // still starts alongside resolveCurrentUser's two sequential backend calls
  // instead of waiting on them.
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
