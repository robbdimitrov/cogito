import { loadNotificationPage } from "$lib/domains/notifications/load.server";
import { apiClient } from "$lib/server/api/client";

export const load = async (event) => {
  const page = await loadNotificationPage(apiClient(event), "");
  return {
    notifications: page.items,
    nextCursor: page.nextCursor,
  };
};
