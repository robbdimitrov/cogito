import { error, isHttpError, json } from "@sveltejs/kit";
import { getUserPosts } from "$lib/domains/posts/api.server";
import { getUser } from "$lib/domains/users/api.server";
import { apiClient } from "$lib/server/api/client";
import { parseIdParam } from "$lib/server/api/http";

export const GET = async (event) => {
  const { params, url } = event;
  const cursor = url.searchParams.get("cursor") ?? "";
  try {
    // Client passes the already-resolved user ID to skip a redundant lookup;
    // fall back to resolving by username if it's missing.
    const userID =
      parseIdParam(url.searchParams.get("userId")) ??
      (
        await getUser(
          apiClient(event),
          decodeURIComponent(params.username).replace(/^@/, ""),
        )
      ).id;
    const feed = await getUserPosts(apiClient(event), userID, cursor);
    return json(feed ?? { items: [], nextCursor: null });
  } catch (e) {
    console.error("Failed to load user posts:", e);
    if (isHttpError(e)) {
      return json(
        { message: e.body.message ?? "The request could not be completed." },
        { status: e.status },
      );
    }
    error(502, "Unable to load profile posts");
  }
};
