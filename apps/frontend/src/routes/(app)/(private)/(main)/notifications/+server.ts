import { json } from "@sveltejs/kit";
import {
  getNotifications,
  markNotificationRead,
} from "$lib/domains/notifications/api.server";
import { apiClient } from "$lib/server/api/client";

export const GET = async (event) => {
  if (!event.cookies.get("session")) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const cursor = event.url.searchParams.get("cursor") ?? "";
  const page = await getNotifications(apiClient(event), cursor);
  return json(page);
};

// Backend's own max page size (docs/api.md); bounds a crafted request from
// fanning a single POST out into an unbounded number of backend PUT calls.
const MAX_MARK_READ_IDS = 100;

// Fired only from onMount (see +page.svelte), never a GET, so speculative preloads can't trigger it.
export const POST = async (event) => {
  if (!event.cookies.get("session")) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const body: { ids?: unknown } = await event.request.json().catch(() => ({}));
  const rawIds = Array.isArray(body.ids) ? body.ids : [];
  const ids = rawIds
    .filter((id): id is number => typeof id === "number")
    .slice(0, MAX_MARK_READ_IDS);
  const api = apiClient(event);
  void Promise.allSettled(ids.map((id) => markNotificationRead(api, id)));
  return json({ success: true });
};
