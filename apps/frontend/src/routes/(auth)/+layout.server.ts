import { resolveCurrentUser } from "$lib/domains/auth/currentUser.server";
import { apiClient } from "$lib/server/api/client";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
  const result = await resolveCurrentUser(apiClient(event));
  if (result.status === "authenticated") {
    redirect(303, "/");
  }

  return {};
};
