import { getSessions } from "./api.server";
import type { User } from "$lib/domains/users/model";
import { getUserById } from "$lib/domains/users/api.server";
import type { ApiClient } from "$lib/server/api/client";
import { isHttpError } from "@sveltejs/kit";

export type CurrentUserResult =
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated"; user: null }
  | { status: "unavailable"; user: null };

export async function resolveCurrentUser(
  api: ApiClient,
  hasSession: boolean,
): Promise<CurrentUserResult> {
  if (!hasSession) {
    return { status: "unauthenticated", user: null };
  }

  try {
    const sessions = await getSessions(api);
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
      user: await getUserById(api, userID),
    };
  } catch (error) {
    if (isHttpError(error) && (error.status === 401 || error.status === 403)) {
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
