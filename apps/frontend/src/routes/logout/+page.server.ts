import { logout } from "$lib/domains/auth/api.server";
import { apiClient } from "$lib/server/api/client";
import { redirect, isHttpError } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions = {
  default: async (event) => {
    try {
      await logout(apiClient(event));
    } catch (error) {
      if (!(isHttpError(error) && error.status === 401)) {
        console.error("Backend logout failed", {
          error: error instanceof Error ? error.name : "UnknownError",
        });
      }
    } finally {
      event.cookies.delete("session", {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "strict",
      });
    }

    redirect(303, "/login");
  },
} satisfies Actions;
