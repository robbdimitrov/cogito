import { describe, expect, it } from "vitest";
import { isHttpError } from "@sveltejs/kit";
import { login } from "./api.server";

describe("login", () => {
  it("sanitizes backend-authored login errors", async () => {
    const api = async () =>
      new Response(JSON.stringify({ message: "invalid credentials detail" }), {
        status: 401,
      });

    try {
      await login(api, "person@example.com", "password");
      throw new Error("expected login to throw");
    } catch (error) {
      expect(isHttpError(error)).toBe(true);
      if (!isHttpError(error)) return;
      expect(error.status).toBe(401);
      expect(error.body.message).toBe("Please sign in to continue.");
      expect(error.body.message).not.toContain("invalid credentials detail");
    }
  });
});
