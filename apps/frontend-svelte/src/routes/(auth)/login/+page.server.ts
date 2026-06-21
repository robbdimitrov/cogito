import { login } from "$lib/domains/auth/api.server";
import { applySetCookies } from "$lib/domains/auth/cookies.server";
import { formString } from "$lib/domains/auth/validation";
import { APIError } from "$lib/shared/transport.server";
import { fail, redirect } from "@sveltejs/kit";
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
      const result = await login(fetch, email, password);
      if (result.setCookies.length === 0) {
        console.error("Login response did not include a session cookie");
        return fail(502, { error: "Login failed", email });
      }
      applySetCookies(cookies, result.setCookies);
    } catch (error) {
      const message =
        error instanceof APIError && error.status < 500
          ? error.message
          : "Login failed";
      return fail(error instanceof APIError ? error.status : 502, {
        error: message,
        email,
      });
    }

    redirect(303, "/");
  },
} satisfies Actions;
