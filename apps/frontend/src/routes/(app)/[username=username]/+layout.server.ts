import { error, fail } from "@sveltejs/kit";
import { getUser, follow, unfollow } from "$lib/domains/users/api.server";
import { apiClient } from "$lib/server/api/client";

export const load = async (event) => {
  const { params } = event;
  const cleanUsername = decodeURIComponent(params.username).replace(/^@/, "");
  try {
    const profileUser = await getUser(apiClient(event), cleanUsername);
    return { profileUser };
  } catch (e) {
    throw error(404, "User not found");
  }
};

