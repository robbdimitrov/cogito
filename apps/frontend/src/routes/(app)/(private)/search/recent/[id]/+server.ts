import type { RequestHandler } from "./$types";
import { apiClient } from "$lib/server/api/client";
import { unwrap } from "$lib/server/api/http";

export const DELETE: RequestHandler = async (event) => {
  if (!event.cookies.get("session")) return new Response(null, { status: 401 });
  await unwrap<null>(
    await apiClient(event)(
      `/search/recent/${encodeURIComponent(event.params.id)}`,
      { method: "DELETE" },
    ),
  );
  return new Response(null, { status: 204 });
};
