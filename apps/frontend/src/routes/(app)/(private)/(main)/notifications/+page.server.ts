import { getNotifications } from "$lib/domains/notifications/api.server";
import { apiClient } from "$lib/server/api/client";

export const load = async (event) => {
  await event.parent();
  const page = await getNotifications(apiClient(event), "");
  return {
    notifications: page.items,
    nextCursor: page.nextCursor,
  };
};
