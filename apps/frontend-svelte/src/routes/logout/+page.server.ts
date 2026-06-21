import { logout } from "$lib/domains/auth/api.server";
import { APIError } from "$lib/shared/transport.server";
import { redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions = {
  default: async ({ fetch, cookies }) => {
    try {
      await logout(fetch);
    } catch (error) {
      if (!(error instanceof APIError && error.status === 401)) {
        console.error("Backend logout failed", {
          error: error instanceof Error ? error.name : "UnknownError",
        });
      }
    } finally {
      cookies.delete("session", {
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "strict",
      });
    }

    redirect(303, "/login");
  },
} satisfies Actions;
