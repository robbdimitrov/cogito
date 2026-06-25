import { resolveCurrentUser } from "$lib/domains/auth/currentUser.server";
import { getUnreadCount } from "$lib/domains/notifications/api.server";
import { apiClient } from "$lib/server/api/client";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
  const result = await resolveCurrentUser(apiClient(event));
  if (result.status === "unauthenticated") {
    redirect(303, "/login");
  }

  let unreadCount = 0;
  if (result.status === "authenticated") {
    try {
      unreadCount =
        event.url.pathname === "/notifications"
          ? 0
          : await getUnreadCount(apiClient(event));
    } catch {
      unreadCount = 0;
    }
  }

  return {
    currentUser: result.user,
    sessionUnavailable: result.status === "unavailable",
    unreadCount,
  };
};
