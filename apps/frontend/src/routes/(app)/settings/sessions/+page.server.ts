import { fail } from "@sveltejs/kit";
import { getSessions, deleteSession } from "$lib/domains/auth/api.server";
import { apiClient } from "$lib/server/api/client";
import { failFromError } from "$lib/server/api/http";

export async function load(event) {
  try {
    const data = await getSessions(apiClient(event));
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
  deleteSession: async (event) => {
    const formData = await event.request.formData();
    const sessionId = formData.get("sessionId") as string;

    if (!sessionId) {
      return fail(400, { error: "Session ID is required" });
    }

    try {
      await deleteSession(apiClient(event), sessionId);
      return { success: true };
    } catch (e) {
      return failFromError(e, "Failed to terminate session");
    }
  },
};
