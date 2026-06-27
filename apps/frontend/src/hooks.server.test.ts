import { describe, expect, it } from "vitest";
import { handle } from "./hooks.server";

describe("handle", () => {
  it("preserves SvelteKit CSP while adding security headers", async () => {
    const csp = "default-src 'self'; script-src 'self' 'nonce-test'";
    const response = await handle({
      event: {
        cookies: {
          get: () => "dark",
        },
      },
      resolve: async (_event, opts) => {
        const html = opts?.transformPageChunk?.({
          html: '<html data-theme="system"></html>',
          done: true,
        });
        return new Response(html, {
          headers: {
            "Content-Security-Policy": csp,
          },
        });
      },
    } as Parameters<typeof handle>[0]);

    expect(await response.text()).toBe('<html data-theme="dark"></html>');
    expect(response.headers.get("Content-Security-Policy")).toBe(csp);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(response.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });
});
