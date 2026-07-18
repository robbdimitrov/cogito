import { describe, expect, it, vi } from "vitest";
import { resolveCurrentUser } from "./currentUser.server";

describe("resolveCurrentUser", () => {
  it("skips the backend call when there is no session cookie", async () => {
    const api = vi.fn();

    const result = await resolveCurrentUser(api, false);

    expect(result).toEqual({ status: "unauthenticated", user: null });
    expect(api).not.toHaveBeenCalled();
  });

  it("calls the backend when a session cookie is present", async () => {
    const api = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 401 })),
    );

    const result = await resolveCurrentUser(api, true);

    expect(result).toEqual({ status: "unauthenticated", user: null });
    expect(api).toHaveBeenCalled();
  });
});
