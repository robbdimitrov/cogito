import { json } from "@sveltejs/kit";
import { loadNotificationPage } from "$lib/domains/notifications/load.server";
import { apiClient } from "$lib/server/api/client";

export const GET = async (event) => {
  const cursor = event.url.searchParams.get("cursor") ?? "";
  const page = await loadNotificationPage(apiClient(event), cursor);
  return json(page);
};
