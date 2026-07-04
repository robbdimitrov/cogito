import { resolveCurrentUser } from "$lib/domains/auth/currentUser.server";
import { getUnreadCount } from "$lib/domains/notifications/api.server";
import { apiClient } from "$lib/server/api/client";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
  // Start the unread-count fetch alongside session resolution instead of
  // after it: it only needs the session cookie already on the request, not
  // the resolved user, so there's no reason to wait on resolveCurrentUser's
  // two sequential backend calls first. Errors (including an eventually
  // unauthenticated session) fall back to 0, matching the previous behavior.
  const unreadCountPromise =
    event.url.pathname === "/notifications"
      ? Promise.resolve(0)
      : getUnreadCount(apiClient(event)).catch(() => 0);

  const result = await resolveCurrentUser(apiClient(event));
  if (result.status === "unauthenticated") {
    redirect(303, "/login");
  }

  const unreadCount =
    result.status === "authenticated" ? await unreadCountPromise : 0;

  return {
    currentUser: result.user,
    sessionUnavailable: result.status === "unavailable",
    unreadCount,
  };
};
