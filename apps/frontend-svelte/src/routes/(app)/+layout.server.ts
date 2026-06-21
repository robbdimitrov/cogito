import { resolveCurrentUser } from "$lib/domains/auth/currentUser.server";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ fetch }) => {
  const result = await resolveCurrentUser(fetch);
  if (result.status === "unauthenticated") {
    redirect(303, "/login");
  }

  return {
    currentUser: result.user,
    sessionUnavailable: result.status === "unavailable",
  };
};
