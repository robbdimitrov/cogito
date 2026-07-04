import { fail } from "@sveltejs/kit";
import { updatePassword } from "$lib/domains/users/api.server";
import { resolveCurrentUser } from "$lib/domains/auth/currentUser.server";
import { apiClient } from "$lib/server/api/client";
import { failFromError } from "$lib/server/api/http";

export const actions = {
  default: async (event) => {
    const { request } = event;
    const userResult = await resolveCurrentUser(apiClient(event));
    if (userResult.status !== "authenticated") {
      return fail(401, { error: "Unauthorized" });
    }

    const formData = await request.formData();
    const oldPassword = formData.get("oldPassword") as string;
    const password = formData.get("password") as string;

    if (!oldPassword || !password) {
      return fail(400, {
        error: "Both current and new passwords are required",
      });
    }

    try {
      await updatePassword(
        apiClient(event),
        userResult.user.id,
        password,
        oldPassword,
      );
      return { success: true };
    } catch (e) {
      return failFromError(e, "Failed to update password", {
        401: "Current password is incorrect",
      });
    }
  },
};
