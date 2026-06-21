import { resolveCurrentUser } from "$lib/domains/auth/currentUser.server";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ fetch }) => {
  const result = await resolveCurrentUser(fetch);
  if (result.status === "authenticated") {
    redirect(303, "/");
  }

  return {};
};
