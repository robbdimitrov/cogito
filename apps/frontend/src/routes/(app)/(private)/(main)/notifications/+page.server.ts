import {
  getNotifications,
  markNotificationRead,
} from "$lib/domains/notifications/api.server";
import { apiClient } from "$lib/server/api/client";

export const load = async (event) => {
  await event.parent();
  const page = await getNotifications(apiClient(event), "");
  return {
    notifications: page.items,
    nextCursor: page.nextCursor,
  };
};

export const actions = {
  // Fired once the page has genuinely mounted (see +page.svelte), never from
  // a GET, so speculative preloads can't trigger it.
  markRead: async (event) => {
    const { request } = event;
    const data = await request.formData();
    const ids = data.getAll("id").map((id) => id.toString());
    const api = apiClient(event);
    void Promise.allSettled(ids.map((id) => markNotificationRead(api, id)));
    return { success: true };
  },
};
