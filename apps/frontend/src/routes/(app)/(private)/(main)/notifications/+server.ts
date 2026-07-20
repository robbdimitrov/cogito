import { json } from "@sveltejs/kit";
import { getNotifications } from "$lib/domains/notifications/api.server";
import { apiClient } from "$lib/server/api/client";

export const GET = async (event) => {
  if (!event.cookies.get("session")) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const cursor = event.url.searchParams.get("cursor") ?? "";
  const page = await getNotifications(apiClient(event), cursor);
  return json(page);
};
