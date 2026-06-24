import { describe, expect, it } from "vitest";
import { isHttpError } from "@sveltejs/kit";
import { unwrap } from "./http";

function response(status: number, body: string = ""): Response {
  return new Response(body || null, { status });
}

describe("unwrap", () => {
  describe("success paths", () => {
    it("returns null for 204 No Content", async () => {
      await expect(unwrap(response(204))).resolves.toBeNull();
    });

    it("returns null for an empty 2xx body", async () => {
      await expect(unwrap(response(200))).resolves.toBeNull();
    });

    it("parses and camelizes a JSON body", async () => {
      const res = response(
        200,
        JSON.stringify({ display_name: "Backend User" }),
      );
      await expect(unwrap<{ displayName: string }>(res)).resolves.toEqual({
        displayName: "Backend User",
      });
    });

    it("throws 502 for a non-JSON body on a 2xx response", async () => {
      await expect(unwrap(response(200, "not json"))).rejects.toSatisfy(
        (e) => isHttpError(e) && e.status === 502,
      );
    });
  });

  describe("error status mapping", () => {
    it.each([
      [400, "The request could not be completed."],
      [401, "Please sign in to continue."],
      [403, "You do not have access to that action."],
      [404, "Not found."],
      [409, "The request conflicts with existing data."],
      [413, "The request is too large."],
      [429, "Too many requests. Please try again later."],
      [500, "The request failed."],
      [502, "The service is temporarily unavailable."],
      [503, "The service is temporarily unavailable."],
      [504, "The service is temporarily unavailable."],
    ])("%i → '%s'", async (status, message) => {
      const err = await unwrap(response(status)).catch((e) => e);
      expect(isHttpError(err)).toBe(true);
      if (!isHttpError(err)) return;
      expect(err.status).toBe(status);
      expect(err.body.message).toBe(message);
    });
  });

  it("does not propagate backend JSON error messages", async () => {
    const res = new Response(
      JSON.stringify({ message: "backend operational detail" }),
      { status: 400 },
    );

    try {
      await unwrap<unknown>(res);
      throw new Error("expected unwrap to throw");
    } catch (error) {
      expect(isHttpError(error)).toBe(true);
      if (!isHttpError(error)) return;
      expect(error.status).toBe(400);
      expect(error.body.message).toBe("The request could not be completed.");
      expect(error.body.message).not.toContain("backend operational detail");
    }
  });

  it("does not propagate raw backend response text", async () => {
    const res = new Response("raw upstream failure text", { status: 503 });

    try {
      await unwrap<unknown>(res);
      throw new Error("expected unwrap to throw");
    } catch (error) {
      expect(isHttpError(error)).toBe(true);
      if (!isHttpError(error)) return;
      expect(error.status).toBe(503);
      expect(error.body.message).toBe(
        "The service is temporarily unavailable.",
      );
      expect(error.body.message).not.toContain("raw upstream failure text");
    }
  });
});
