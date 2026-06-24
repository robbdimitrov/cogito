import { login } from "$lib/domains/auth/api.server";
import { formString } from "$lib/domains/auth/validation";
import { fail, redirect, isHttpError } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions = {
  default: async ({ request, fetch, cookies }) => {
    const data = await request.formData();
    const email = formString(data, "email").trim();
    const password = formString(data, "password");

    if (!email || !password) {
      return fail(400, { error: "Email and password are required", email });
    }

    try {
      await login(fetch, email, password);
      if (!cookies.get("session")) {
        console.error("Login response did not include a session cookie");
        return fail(502, { error: "Login failed", email });
      }
    } catch (error) {
      const message =
        isHttpError(error) && error.status === 401
          ? "Incorrect email or password"
          : "Login failed";
      return fail(isHttpError(error) ? error.status : 502, {
        error: message,
        email,
      });
    }

    redirect(303, "/");
  },
} satisfies Actions;
