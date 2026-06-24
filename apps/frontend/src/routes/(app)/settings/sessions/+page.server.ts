import { fail } from "@sveltejs/kit";
import { getSessions, deleteSession } from "$lib/domains/auth/api.server";
import { failFromError } from "$lib/server/api/http";

export async function load({ fetch }) {
  try {
    const data = await getSessions(fetch);
    return {
      sessions: data.sessions || [],
      currentSessionId: data.currentSessionId || null,
      error: null,
    };
  } catch (error) {
    console.error("Sessions error:", error);
    return {
      sessions: [],
      currentSessionId: null,
      error: "Failed to load sessions",
    };
  }
}

export const actions = {
  deleteSession: async ({ request, fetch }) => {
    const formData = await request.formData();
    const sessionId = formData.get("sessionId") as string;

    if (!sessionId) {
      return fail(400, { error: "Session ID is required" });
    }

    try {
      await deleteSession(fetch, sessionId);
      return { success: true };
    } catch (e) {
      return failFromError(e, "Failed to terminate session");
    }
  },
};
