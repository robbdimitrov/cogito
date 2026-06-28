import { login } from "$lib/domains/auth/api.server";
import { formString, validateRegister } from "$lib/domains/auth/validation";
import { createUser } from "$lib/domains/users/api.server";
import { errorMessage } from "$lib/server/api/http";
import { apiClient } from "$lib/server/api/client";
import { fail, redirect, isHttpError } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions = {
  default: async (event) => {
    const { request, cookies } = event;
    const data = await request.formData();
    const name = formString(data, "name").trim();
    const username = formString(data, "username").trim();
    const email = formString(data, "email").trim();
    const password = formString(data, "password");
    const fields = { name, username, email };
    const validationError = validateRegister(name, username, email, password);

    if (validationError) {
      return fail(400, { error: validationError, fields });
    }

    try {
      await createUser(apiClient(event), name, username, email, password);
    } catch (error) {
      if (!isHttpError(error)) {
        return fail(502, { error: "Registration failed", fields });
      }
      const message =
        error.status === 409
          ? "An account with those details already exists"
          : errorMessage(error.status);
      return fail(error.status, { error: message, fields });
    }

    try {
      await login(apiClient(event), email, password);
      if (!cookies.get("session")) {
        console.error(
          "Registration login response did not include a session cookie",
        );
        return fail(502, {
          error: "Account created, but login failed",
          fields,
        });
      }
    } catch (e) {
      console.error("Post-registration login failed:", e);
      return fail(502, { error: "Account created, but login failed", fields });
    }

    redirect(303, "/");
  },
} satisfies Actions;
