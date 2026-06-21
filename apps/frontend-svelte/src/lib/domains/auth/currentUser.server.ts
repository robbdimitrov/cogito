import { getSessions } from "./api.server";
import type { User } from "$lib/domains/users/model";
import { getUser } from "$lib/domains/users/api.server";
import { APIError, type ServerFetch } from "$lib/shared/transport.server";

export type CurrentUserResult =
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated"; user: null }
  | { status: "unavailable"; user: null };

export async function resolveCurrentUser(
  fetch: ServerFetch,
): Promise<CurrentUserResult> {
  try {
    const sessions = await getSessions(fetch);
    const userID =
      sessions.userId ??
      sessions.sessions.find(
        (session) => session.id === sessions.currentSessionId,
      )?.userId;

    if (!userID) {
      return { status: "unauthenticated", user: null };
    }

    return {
      status: "authenticated",
      user: await getUser(fetch, userID),
    };
  } catch (error) {
    if (
      error instanceof APIError &&
      (error.status === 401 || error.status === 403)
    ) {
      return { status: "unauthenticated", user: null };
    }

    console.error("Current user resolution failed", {
      error: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown error",
      cause:
        error instanceof Error && error.cause instanceof Error
          ? error.cause.message
          : undefined,
    });
    return { status: "unavailable", user: null };
  }
}
