import { login } from "$lib/domains/auth/api.server";
import { formString, validateSignup } from "$lib/domains/auth/validation";
import { createUser } from "$lib/domains/users/api.server";
import { APIError } from "$lib/shared/transport.server";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions = {
  default: async ({ request, fetch, cookies }) => {
    const data = await request.formData();
    const name = formString(data, "name").trim();
    const username = formString(data, "username").trim();
    const email = formString(data, "email").trim();
    const password = formString(data, "password");
    const fields = { name, username, email };
    const validationError = validateSignup(name, username, email, password);

    if (validationError) {
      return fail(400, { error: validationError, fields });
    }

    try {
      await createUser(fetch, name, username, email, password);
      await login(fetch, email, password);
      if (!cookies.get("session")) {
        console.error("Signup login response did not include a session cookie");
        return fail(502, {
          error: "Account created, but login failed",
          fields,
        });
      }
    } catch (error) {
      const message =
        error instanceof APIError && error.status < 500
          ? error.message
          : "Signup failed";
      return fail(error instanceof APIError ? error.status : 502, {
        error: message,
        fields,
      });
    }

    redirect(303, "/");
  },
} satisfies Actions;
