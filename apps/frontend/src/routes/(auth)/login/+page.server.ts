import { login } from "$lib/domains/auth/api.server";
import { formString } from "$lib/domains/auth/validation";
import { errorMessage } from "$lib/server/api/http";
import { apiClient } from "$lib/server/api/client";
import { fail, redirect, isHttpError } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions = {
  default: async (event) => {
    const { request, cookies } = event;
    const data = await request.formData();
    const email = formString(data, "email").trim();
    const password = formString(data, "password");

    if (!email || !password) {
      return fail(400, { error: "Email and password are required", fields: { email } });
    }

    try {
      await login(apiClient(event), email, password);
      if (!cookies.get("session")) {
        console.error("Login response did not include a session cookie");
        return fail(502, { error: "Login failed", fields: { email } });
      }
    } catch (error) {
      if (!isHttpError(error)) {
        return fail(502, { error: "Login failed", fields: { email } });
      }
      const message =
        error.status === 401
          ? "Incorrect email or password"
          : errorMessage(error.status);
      return fail(error.status, { error: message, fields: { email } });
    }

    redirect(303, "/");
  },
} satisfies Actions;
