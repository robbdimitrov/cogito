import { describe, expect, it } from "vitest";
import type { RequestEvent } from "@sveltejs/kit";
import { handle } from "./hooks.server";

describe("handle", () => {
  it("preserves SvelteKit CSP while adding security headers", async () => {
    const csp = "default-src 'self'; script-src 'self' 'nonce-test'";
    // The real RequestEvent has ~15 properties this test never touches
    // (fetch, getClientAddress, locals, params, ...); cast just this mock
    // rather than padding it out, so `resolve` below still gets its real,
    // non-`any` parameter types from `handle`'s signature.
    const event = {
      cookies: {
        get: () => "dark",
      },
    } as unknown as RequestEvent;

    const response = await handle({
      event,
      resolve: async (_event, opts) => {
        const html = await opts?.transformPageChunk?.({
          html: '<html data-theme="system"></html>',
          done: true,
        });
        return new Response(html, {
          headers: {
            "Content-Security-Policy": csp,
          },
        });
      },
    });

    expect(await response.text()).toBe('<html data-theme="dark"></html>');
    expect(response.headers.get("Content-Security-Policy")).toBe(csp);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(response.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });
});
