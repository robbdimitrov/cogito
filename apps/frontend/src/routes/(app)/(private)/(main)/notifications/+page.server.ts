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

// Backend's own max page size (docs/api.md); bounds a crafted request from
// fanning a single POST out into an unbounded number of backend PUT calls.
const MAX_MARK_READ_IDS = 100;

export const actions = {
  // Fired once the page has genuinely mounted (see +page.svelte), never from
  // a GET, so speculative preloads can't trigger it.
  markRead: async (event) => {
    const { request } = event;
    const data = await request.formData();
    const ids = data
      .getAll("id")
      .slice(0, MAX_MARK_READ_IDS)
      .map((id) => id.toString());
    const api = apiClient(event);
    void Promise.allSettled(ids.map((id) => markNotificationRead(api, id)));
    return { success: true };
  },
};
